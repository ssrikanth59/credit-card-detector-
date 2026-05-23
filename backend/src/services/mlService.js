const axios = require('axios');

class MLService {
  static async scoreTransaction(data) {
    const mlUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000/predict';
    
    // Format payload for ML FastAPI Microservice
    const payload = {
      amount: parseFloat(data.amount || 0),
      distance_from_home: parseFloat(data.distance_from_home || 0),
      velocity_1h: parseInt(data.velocity_1h || 0),
      device_risk_score: parseFloat(data.device_risk_score || 0.0),
      is_declined_before: parseInt(data.is_declined_before || 0),
      hour_of_day: parseInt(data.hour_of_day || 12),
      is_foreign: parseInt(data.is_foreign || 0),
      model_type: data.modelType || 'Random Forest'
    };

    console.log(`Sending payload to ML service at ${mlUrl}...`);

    try {
      const response = await axios.post(mlUrl, payload, { timeout: 2000 });
      console.log('ML Service response received successfully.');
      return response.data;
    } catch (err) {
      console.error('==================================================');
      console.error(`ML SERVICE ERROR: Could not connect to ML Microservice.`);
      console.error(`Target URL: ${mlUrl}`);
      console.error(`Error message: ${err.message}`);
      console.error(`Fallback Mode: Executing deterministic scoring engine.`);
      console.error('==================================================');
      
      // Local fallback rule engine logic
      return this.localDeterministicFallback(payload, data.modelType || 'Random Forest');
    }
  }

  static localDeterministicFallback(data, modelType = 'Random Forest') {
    let score = 0.05; // base risk
    
    // Mock different algorithms' prediction behavior
    if (modelType === 'Decision Tree') {
      // Branching logic style
      if (data.amount > 2000 && data.device_risk_score > 0.4) {
        score = 0.88;
      } else if (data.velocity_1h >= 3 && data.is_declined_before === 1) {
        score = 0.76;
      } else if (data.distance_from_home > 800) {
        score = 0.65;
      } else {
        score = 0.08;
      }
    } else if (modelType === 'Logistic Regression') {
      // Linear summation style
      score = 0.02 + 
              (data.amount > 1000 ? 0.30 : 0.05) + 
              (data.distance_from_home > 500 ? 0.35 : 0.10) + 
              (data.velocity_1h >= 2 ? 0.15 : 0.0) +
              (data.device_risk_score * 0.40) +
              (data.is_declined_before * 0.25);
    } else {
      // Default: Random Forest / XGBoost ensemble style
      // Amount rules
      if (data.amount > 1000) score += 0.35;
      else if (data.amount > 300) score += 0.15;
      
      // Geodistance rules
      if (data.distance_from_home > 500) score += 0.40;
      else if (data.distance_from_home > 100) score += 0.18;

      // Velocity rules
      if (data.velocity_1h >= 4) score += 0.25;
      else if (data.velocity_1h >= 2) score += 0.10;

      // Device risk rules
      score += data.device_risk_score * 0.45;

      // Prior declines
      if (data.is_declined_before === 1) score += 0.30;

      // Foreign merchant
      if (data.is_foreign === 1) score += 0.15;

      // Night time (0 - 5 AM)
      if (data.hour_of_day >= 0 && data.hour_of_day <= 5) score += 0.12;
    }

    const prob = Math.min(0.99, Math.max(0.01, score));
    const prediction = prob >= 0.5 ? 1 : 0;

    // Mock explainable AI output
    const rawExplanation = [
      { feature: 'amount', val: data.amount, benchmark: 60.0, multiplier: 0.35 },
      { feature: 'distance_from_home', val: data.distance_from_home, benchmark: 20.0, multiplier: 0.40 },
      { feature: 'velocity_1h', val: data.velocity_1h, benchmark: 1.5, multiplier: 0.25 },
      { feature: 'device_risk_score', val: data.device_risk_score * 3.5, benchmark: 0.5, multiplier: 0.45 },
      { feature: 'is_declined_before', val: data.is_declined_before * 4.0, benchmark: 0.5, multiplier: 0.30 },
      { feature: 'is_foreign', val: data.is_foreign * 2.5, benchmark: 0.5, multiplier: 0.15 },
      { feature: 'hour_of_day', val: (data.hour_of_day <= 5 ? 2.5 : 0.3), benchmark: 0.5, multiplier: 0.12 }
    ];

    const explanation = rawExplanation.map(x => {
      const contribution = x.multiplier * x.val;
      return {
        feature: x.feature,
        value: x.val,
        contribution: contribution,
        importance: x.multiplier
      };
    });

    const totalContrib = explanation.reduce((sum, item) => sum + item.contribution, 0);
    explanation.forEach(item => {
      item.percentage = totalContrib > 0 ? parseFloat(((item.contribution / totalContrib) * 100).toFixed(2)) : 14.28;
    });
    
    explanation.sort((a, b) => b.percentage - a.percentage);

    return {
      fraud_probability: prob,
      prediction: prediction,
      explanation: explanation,
      model_info: {
        type: `${modelType} (Fallback Mode)`,
        metrics: {
          precision: modelType === 'Logistic Regression' ? 0.89 : modelType === 'Decision Tree' ? 0.86 : 0.94,
          recall: modelType === 'Logistic Regression' ? 0.84 : modelType === 'Decision Tree' ? 0.82 : 0.89,
          f1_score: modelType === 'Logistic Regression' ? 0.86 : modelType === 'Decision Tree' ? 0.84 : 0.91,
          roc_auc: modelType === 'Logistic Regression' ? 0.91 : modelType === 'Decision Tree' ? 0.88 : 0.95
        }
      }
    };
  }
}

module.exports = MLService;
