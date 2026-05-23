const axios = require('axios');

class TelegramService {
  static async sendFraudAlert(transaction) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    const riskBadge = transaction.riskScore >= 75 ? '🚨 HIGH RISK 🚨' : '⚠️ MEDIUM RISK ⚠️';
    const maskedCard = transaction.cardNumber;
    
    // Format message
    const message = `
*${riskBadge} Fraud Alert*
-----------------------------------
*Cardholder:* ${transaction.cardholderName}
*Card:* ${maskedCard}
*Amount:* $${transaction.amount.toFixed(2)}
*Merchant:* ${transaction.merchant} (${transaction.merchantCategory || 'Retail'})
*Location:* ${transaction.location?.city || 'Unknown'}, ${transaction.location?.country || 'Unknown'}
*IP Address:* ${transaction.ipAddress || 'Unknown'}

*Risk Analysis:*
• *Risk Score:* \`${transaction.riskScore}%\`
• *Decision:* \`${transaction.decision}\`
• *Velocity (1h):* ${transaction.velocity_1h} tx
• *Device Risk:* \`${(transaction.device_risk_score * 100).toFixed(1)}%\`
• *Distance:* \`${transaction.distance_from_home.toFixed(1)} km\`
• *Declined Before?:* ${transaction.is_declined_before ? 'Yes' : 'No'}

*Top Indicators:*
${transaction.explanation.slice(0, 3).map(e => `- *${e.feature}*: \`${e.percentage}%\` impact (val: ${e.value.toFixed(1)})`).join('\n')}

_Action Links:_
[Approve Transaction](${process.env.APP_URL || 'http://localhost:5173'}/alerts/approve/${transaction._id}) | [Block Card](${process.env.APP_URL || 'http://localhost:5173'}/alerts/block/${transaction._id})
`;

    // Console Logging always
    console.log('==================================================');
    console.log(`TELEGRAM OUTGOING ALERT [Chat: ${chatId || 'MOCK_CHAT'}]:`);
    console.log(message);
    console.log('==================================================');

    if (!token || !chatId) {
      console.log('Telegram Alert not sent via HTTP: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID environment variables are missing.');
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      await axios.post(url, {
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Approve & Dismiss', callback_data: `dismiss_${transaction._id}` },
              { text: '❌ Block Credit Card', callback_data: `block_${transaction._id}` }
            ]
          ]
        }
      });
      console.log('Telegram Alert dispatched successfully.');
      return true;
    } catch (err) {
      console.error(`Failed to send Telegram message: ${err.message}`);
      if (err.response && err.response.data) {
        console.error('Telegram API Error details:', err.response.data);
      }
      return false;
    }
  }

  // Processes webhook calls from Telegram Bot (e.g. inline buttons press)
  static async handleWebhook(body) {
    if (!body || !body.callback_query) return null;
    
    const query = body.callback_query;
    const data = query.data; // e.g. "block_tx123"
    const messageId = query.message.message_id;
    const chatId = query.message.chat.id;
    
    const [action, txId] = data.split('_');
    
    console.log(`Telegram Bot Action: ${action} on Transaction ID: ${txId}`);
    
    const TransactionModel = require('../models/Transaction');
    const transaction = await TransactionModel.findById(txId);
    
    if (!transaction) {
      return {
        text: 'Transaction not found.',
        chat_id: chatId,
        message_id: messageId
      };
    }

    let statusUpdate = {};
    let responseText = '';

    if (action === 'block') {
      statusUpdate = { status: 'BLOCKED', decision: 'BLOCKED' };
      responseText = `Blocked credit card for ${transaction.cardholderName}.`;
    } else if (action === 'dismiss') {
      statusUpdate = { status: 'APPROVED' };
      responseText = `Approved transaction of $${transaction.amount} for ${transaction.cardholderName}.`;
    }

    await TransactionModel.findByIdAndUpdate(txId, statusUpdate);

    // Edit message in Telegram chat to show result
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (token) {
      try {
        await axios.post(`https://api.telegram.org/bot${token}/editMessageText`, {
          chat_id: chatId,
          message_id: messageId,
          text: `${query.message.text}\n\n*Operator Decision:* ${action === 'block' ? '🔴 BLOCKED' : '🟢 APPROVED'} (by Telegram)`,
          parse_mode: 'Markdown'
        });
      } catch (err) {
        console.error('Failed to update Telegram message:', err.message);
      }
    }

    return responseText;
  }

  static async processIncomingUpdate(update) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return;

    if (update.callback_query) {
      await this.handleWebhook({ callback_query: update.callback_query });
      return;
    }

    if (!update.message || !update.message.text) return;
    const msg = update.message;
    const text = msg.text.trim();
    const chatId = msg.chat.id;

    if (text === '/start' || text === '/help') {
      const welcome = `
*Welcome to FraudShield AI Bot!* 🛡️
I am your automated credit card verification assistant.

*Available Commands:*
• \`/check <card_number>\` - Verifies a credit card for validity, brand, BIN details, and fraud patterns.
• \`/status\` - Checks if the FraudShield backend is active.
`;
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text: welcome,
        parse_mode: 'Markdown'
      }).catch(err => console.error('Error sending bot message:', err.message));
      return;
    }

    if (text === '/status') {
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text: `✅ *FraudShield AI System Status:* \`ONLINE\``,
        parse_mode: 'Markdown'
      }).catch(err => console.error('Error sending bot message:', err.message));
      return;
    }

    if (text.startsWith('/check')) {
      const args = text.split(/\s+/).slice(1);
      const rawCard = args.join('');
      const cleanCard = rawCard.replace(/\D/g, '');

      if (!cleanCard) {
        await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
          chat_id: chatId,
          text: `⚠️ *Usage:* \`/check <card_number>\`\n_Example: \`/check 4111222233334589\`_`,
          parse_mode: 'Markdown'
        }).catch(err => console.error('Error sending bot message:', err.message));
        return;
      }

      // Run validations
      const cardValidator = require('../utils/cardValidator');
      const ApiVerificationService = require('./apiVerificationService');

      const luhnValid = cardValidator.validateLuhn(cleanCard);
      const brand = cardValidator.detectBrand(cleanCard);
      const fraudPatterns = cardValidator.detectFraudPatterns(cleanCard);
      
      // BIN lookup
      const binInfo = await ApiVerificationService.verifyBIN(cleanCard);
      const cardBrand = binInfo.brand || brand;
      const cardType = binInfo.type;
      const cardIssuer = binInfo.issuer;
      const cardCountry = binInfo.country;

      // Mask card number
      const first4 = cleanCard.substring(0, 4);
      const last4 = cleanCard.substring(cleanCard.length - 4);
      const masked = cleanCard.length >= 12 ? `${first4}********${last4}` : cleanCard;

      let overallRisk = '🟢 LOW RISK';
      let riskScore = 5;

      if (!luhnValid) {
        overallRisk = '🚨 CRITICAL: FAKE CARD (Luhn Failed)';
        riskScore = 100;
      } else if (fraudPatterns.length > 0) {
        overallRisk = '🔴 HIGH RISK (Pattern Flag)';
        riskScore = 95;
      } else if (cardBrand === 'Unknown') {
        overallRisk = '⚠️ MEDIUM RISK (Unknown Brand)';
        riskScore = 50;
      }

      const report = `
💳 *Card Verification Report*
-----------------------------------
• *Card Number:* \`${masked}\`
• *Detected Brand:* \`${cardBrand}\`
• *Card Type:* \`${cardType}\`
• *Issuer Bank:* \`${cardIssuer}\`
• *Issuer Country:* \`${cardCountry}\`

🔍 *Technical Checksum Validation:*
• *Luhn Check:* ${luhnValid ? '✅ VALID' : '❌ INVALID'}
• *Format Length:* ${cleanCard.length >= 15 && cleanCard.length <= 16 ? '✅ OK' : '⚠️ SUSPICIOUS'}
• *Fraud Patterns:* ${fraudPatterns.length > 0 ? `🚨 Triggered (${fraudPatterns.length})` : '✅ None'}

${fraudPatterns.map(p => `  _- ${p}_`).join('\n')}

🛡️ *AI Risk Analysis Score:* \`${riskScore}%\`
*Verdict:* *${overallRisk}*
`;

      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text: report,
        parse_mode: 'Markdown'
      }).catch(err => console.error('Error sending bot message:', err.message));
    }
  }

  static startPolling() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.log('Telegram Bot: No bot token provided. Polling client disabled.');
      return;
    }
    console.log('Telegram Bot: Starting polling engine for commands (getUpdates)...');
    let offset = 0;

    const poll = async () => {
      try {
        const response = await axios.get(`https://api.telegram.org/bot${token}/getUpdates`, {
          params: { offset, timeout: 5 },
          timeout: 10000
        });

        if (response.data && response.data.ok) {
          const updates = response.data.result;
          for (const update of updates) {
            offset = update.update_id + 1;
            // Run async to avoid blocking polling loop
            TelegramService.processIncomingUpdate(update).catch(err => {
              console.error('Error processing update:', err.message);
            });
          }
        }
      } catch (err) {
        if (err.code !== 'ECONNABORTED' && err.message !== 'timeout of 10000ms exceeded') {
          console.error(`Telegram Bot Polling Error: ${err.message}`);
        }
      }
      // Poll again in 3 seconds
      setTimeout(poll, 3000);
    };

    poll();
  }
}

module.exports = TelegramService;
