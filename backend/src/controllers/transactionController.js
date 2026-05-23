const TransactionModel = require('../models/Transaction');
const RuleModel = require('../models/Rule');
const MLService = require('../services/mlService');
const TelegramService = require('../services/telegramService');
const BehaviorService = require('../services/behaviorService');
const cardValidator = require('../utils/cardValidator');
const ApiVerificationService = require('../services/apiVerificationService');
const crypto = require('crypto');

class TransactionController {
  static maskCardNumber(cardNum) {
    if (!cardNum || cardNum.length < 12) return '************';
    const cleanNum = cardNum.replace(/\s+/g, '');
    const first4 = cleanNum.substring(0, 4);
    const last4 = cleanNum.substring(cleanNum.length - 4);
    return `${first4}********${last4}`;
  }

  static async processTransaction(req, res) {
    const {
      cardholderName,
      cardNumber,
      cvv,
      expiryDate,
      amount,
      merchant,
      merchantCategory,
      location, // { latitude, longitude, city, country }
      deviceFingerprint, // { browser, os, screenResolution, language, hash }
      ipAddress,
      modelType // 'Random Forest' | 'XGBoost' | 'Logistic Regression' | 'Decision Tree'
    } = req.body;

    if (!cardholderName || !cardNumber || typeof amount === 'undefined' || !merchant) {
      return res.status(400).json({ success: false, message: 'Missing required transaction fields.' });
    }

    try {
      const cleanCardNumber = cardNumber.replace(/\s+/g, '');
      const cardHash = crypto.createHash('sha256').update(cleanCardNumber).digest('hex');

      // 1. Run Card Validation Checks
      const luhnValid = cardValidator.validateLuhn(cleanCardNumber);
      const brand = cardValidator.detectBrand(cleanCardNumber);
      const cvvValid = cvv ? cardValidator.validateCVV(cvv, brand) : true;
      const expiryValid = expiryDate ? cardValidator.validateExpiry(expiryDate) : true;
      const fraudPatternsTriggered = cardValidator.detectFraudPatterns(cleanCardNumber);

      // 2. Fetch BIN Metadata
      const binInfo = await ApiVerificationService.verifyBIN(cleanCardNumber);
      const cardBrand = binInfo.brand || brand;
      const cardType = binInfo.type;
      const cardIssuer = binInfo.issuer;
      const cardCountry = binInfo.country;

      // 3. Gather behavioral profiling parameters
      const velocity_1h = await BehaviorService.getVelocity1h(cardHash, cleanCardNumber);
      const is_declined_before = await BehaviorService.hasRecentDeclines(cardHash, cleanCardNumber);
      const distance_from_home = BehaviorService.getDistanceFromHome(cardholderName, location);
      const device_risk_score = await BehaviorService.evaluateDeviceIntelligence(deviceFingerprint, cardholderName, ipAddress);
      
      const txHour = new Date().getHours();
      
      // Geolocation check for foreign merchant
      const homeInfo = BehaviorService.getHomeCoordinates(cardholderName);
      const is_foreign = location && location.country && location.country !== homeInfo.country ? 1 : 0;

      let finalDecision = 'APPROVED';
      let riskScore = 0;
      let mlResult = null;
      let overrideReason = '';

      // Check card validity overrides
      if (!luhnValid) {
        finalDecision = 'BLOCKED';
        riskScore = 100;
        overrideReason = 'Luhn Checksum Validation Failed (Fake Card Number)';
      } else if (!expiryValid) {
        finalDecision = 'BLOCKED';
        riskScore = 100;
        overrideReason = 'Expired Credit Card';
      } else if (!cvvValid) {
        finalDecision = 'BLOCKED';
        riskScore = 95;
        overrideReason = 'Invalid CVV Format';
      } else if (fraudPatternsTriggered.includes('Suspicious consecutive repeating digits') || fraudPatternsTriggered.includes('Unrealistic numerical sequence detected')) {
        finalDecision = 'BLOCKED';
        riskScore = 98;
        overrideReason = fraudPatternsTriggered[0];
      }

      if (overrideReason) {
        // Mock ML result for validation block
        mlResult = {
          fraud_probability: riskScore / 100,
          prediction: 1,
          explanation: [
            { feature: 'card_validation', value: 1, contribution: riskScore, percentage: 100, importance: 1 }
          ],
          model_info: { type: 'Card Validation Engine' }
        };
      } else {
        // Submit to Machine Learning Microservice
        const mlInput = {
          amount,
          distance_from_home,
          velocity_1h,
          device_risk_score,
          is_declined_before,
          hour_of_day: txHour,
          is_foreign,
          modelType: modelType || 'Random Forest'
        };

        mlResult = await MLService.scoreTransaction(mlInput);
        const probability = mlResult.fraud_probability;
        let mlDecision = mlResult.prediction === 1 ? 'FLAGGED' : 'APPROVED';
        if (probability >= 0.75) mlDecision = 'BLOCKED';
        
        finalDecision = mlDecision;
        riskScore = Math.round(probability * 100);
      }

      // 4. Evaluate Rule-based Threshold Override Engine
      const activeRules = await RuleModel.find({ isActive: true });
      let ruleTriggered = null;
      let ruleAction = null;

      for (const rule of activeRules) {
        if (rule.type === 'amount_limit' && amount > rule.value) {
          ruleTriggered = rule;
          ruleAction = rule.action;
        } else if (rule.type === 'velocity_limit' && velocity_1h >= rule.value) {
          ruleTriggered = rule;
          ruleAction = rule.action;
        } else if (rule.type === 'device_risk_threshold' && device_risk_score >= rule.value) {
          ruleTriggered = rule;
          ruleAction = rule.action;
        } else if (rule.type === 'country_blacklist' && Array.isArray(rule.value)) {
          if (location && location.country && rule.value.includes(location.country)) {
            ruleTriggered = rule;
            ruleAction = rule.action;
          }
        }
        
        // Break early if we hit a blocking rule
        if (ruleAction === 'BLOCKED') break;
      }

      // Rules override ML prediction if they are more severe
      if (ruleTriggered && !overrideReason) {
        console.log(`RULE TRIGGERED: "${ruleTriggered.name}" -> Action: ${ruleAction}`);
        if (ruleAction === 'BLOCKED') {
          finalDecision = 'BLOCKED';
          riskScore = Math.max(riskScore, 90);
        } else if (ruleAction === 'FLAGGED' && finalDecision === 'APPROVED') {
          finalDecision = 'FLAGGED';
          riskScore = Math.max(riskScore, 65);
        }
      }

      let status = 'APPROVED';
      if (finalDecision === 'BLOCKED') {
        status = 'BLOCKED';
      } else if (finalDecision === 'FLAGGED') {
        status = 'PENDING_REVIEW';
      }

      // 5. Save transaction records (secure data handling: no CVV, masked number, cardHash saved)
      const maskedCard = TransactionController.maskCardNumber(cardNumber);
      const transaction = await TransactionModel.create({
        cardholderName,
        cardNumber: maskedCard,
        amount,
        merchant,
        merchantCategory: merchantCategory || 'Retail',
        location: location || { city: 'Unknown', country: 'Unknown', latitude: 0, longitude: 0 },
        deviceFingerprint: deviceFingerprint || { browser: 'Unknown', os: 'Unknown', screenResolution: 'Unknown', language: 'Unknown', hash: 'Unknown' },
        ipAddress: ipAddress || 'Unknown',
        velocity_1h,
        device_risk_score,
        distance_from_home,
        is_declined_before,
        hour_of_day: txHour,
        is_foreign,
        
        // Save validation and BIN details
        cardBrand,
        cardType,
        cardIssuer,
        cardCountry,
        cardHash,
        luhnValid,
        cvvValid,
        expiryValid,
        fraudPatternsTriggered,

        riskScore,
        decision: finalDecision,
        explanation: mlResult.explanation,
        status
      });

      // 6. Fire Telegram Notification if flagged/blocked
      if (finalDecision === 'FLAGGED' || finalDecision === 'BLOCKED') {
        TelegramService.sendFraudAlert(transaction).catch(err => {
          console.error("Async Telegram alert failed:", err.message);
        });
      }

      res.status(200).json({
        success: true,
        message: `Transaction processed. Decision: ${finalDecision}`,
        transactionId: transaction._id,
        decision: finalDecision,
        riskScore,
        status,
        explanation: mlResult.explanation,
        model_info: mlResult.model_info,
        ruleTriggered: ruleTriggered ? { name: ruleTriggered.name, action: ruleAction } : null,
        validation: {
          brand: cardBrand,
          issuer: cardIssuer,
          country: cardCountry,
          type: cardType,
          luhnValid,
          cvvValid,
          expiryValid,
          fraudPatterns: fraudPatternsTriggered
        }
      });

    } catch (error) {
      console.error('Transaction processing error:', error.message);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async getTransactions(req, res) {
    try {
      const { status, decision, cardholderName, minRiskScore } = req.query;
      let query = {};

      if (status) query.status = status;
      if (decision) query.decision = decision;
      if (cardholderName) {
        query.cardholderName = { $regex: cardholderName, $options: 'i' };
      }
      if (minRiskScore) {
        query.riskScore = { $gte: parseInt(minRiskScore) };
      }

      const transactions = await TransactionModel.find(query, { createdAt: -1 });
      res.status(200).json({ success: true, count: transactions.length, transactions });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getTransactionById(req, res) {
    try {
      const transaction = await TransactionModel.findById(req.params.id);
      if (!transaction) {
        return res.status(404).json({ success: false, message: 'Transaction not found.' });
      }
      res.status(200).json({ success: true, transaction });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateStatus(req, res) {
    const { status } = req.body;
    
    if (!status || !['APPROVED', 'BLOCKED', 'REFUNDED', 'REPORTED_FRAUD'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status update request.' });
    }

    try {
      const updated = await TransactionModel.findByIdAndUpdate(
        req.params.id,
        { 
          $set: { 
            status,
            decision: status === 'BLOCKED' ? 'BLOCKED' : undefined 
          } 
        },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Transaction not found.' });
      }

      res.status(200).json({ success: true, message: `Status updated to ${status}`, transaction: updated });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Handle callback triggers from Telegram Bot API webhooks
  static async handleTelegramWebhook(req, res) {
    try {
      const response = await TelegramService.handleWebhook(req.body);
      if (response) {
        return res.status(200).json({ ok: true, message: response });
      }
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Telegram webhook error:', error.message);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = TransactionController;
