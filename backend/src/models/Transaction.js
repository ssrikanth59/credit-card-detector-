const mongoose = require('mongoose');

const ExplanationSchema = new mongoose.Schema({
  feature: String,
  value: Number,
  contribution: Number,
  importance: Number,
  percentage: Number
});

const TransactionSchema = new mongoose.Schema({
  cardholderName: { type: String, required: true },
  cardNumber: { type: String, required: true }, // masked
  amount: { type: Number, required: true },
  merchant: { type: String, required: true },
  merchantCategory: { type: String, default: 'Retail' },
  location: {
    city: String,
    country: String,
    latitude: Number,
    longitude: Number
  },
  deviceFingerprint: {
    browser: String,
    os: String,
    screenResolution: String,
    language: String,
    hash: String
  },
  ipAddress: { type: String },
  velocity_1h: { type: Number, default: 0 },
  device_risk_score: { type: Number, default: 0.0 },
  distance_from_home: { type: Number, default: 0.0 },
  is_declined_before: { type: Number, default: 0 },
  hour_of_day: { type: Number, default: 12 },
  is_foreign: { type: Number, default: 0 },
  
  // Card verification and BIN metadata fields
  cardBrand: { type: String, default: 'Unknown' },
  cardType: { type: String, default: 'Unknown' },
  cardIssuer: { type: String, default: 'Unknown' },
  cardCountry: { type: String, default: 'Unknown' },
  cardHash: { type: String },
  luhnValid: { type: Boolean, default: false },
  cvvValid: { type: Boolean, default: false },
  expiryValid: { type: Boolean, default: false },
  fraudPatternsTriggered: [{ type: String }],

  riskScore: { type: Number, required: true }, // 0 - 100
  decision: { type: String, enum: ['APPROVED', 'FLAGGED', 'BLOCKED'], required: true },
  explanation: [ExplanationSchema],
  status: { type: String, enum: ['APPROVED', 'PENDING_REVIEW', 'BLOCKED', 'REFUNDED', 'REPORTED_FRAUD'], default: 'APPROVED' },
  createdAt: { type: Date, default: Date.now }
});

const MongoTransaction = mongoose.model('Transaction', TransactionSchema);

// In-memory mock database storage
let mockTransactions = [];

class TransactionModel {
  static getMongoModel() {
    return MongoTransaction;
  }

  static async find(query = {}, sort = { createdAt: -1 }, limit = 0) {
    if (!global.useMockDB) {
      try {
        let q = MongoTransaction.find(query);
        if (sort) q = q.sort(sort);
        if (limit) q = q.limit(limit);
        return await q.exec();
      } catch (err) {
        console.log("Mongoose transaction query failed, falling back to mock.");
      }
    }

    // Mock search filter logic
    let results = [...mockTransactions];
    
    // Simple filter support
    if (query.status) {
      results = results.filter(t => t.status === query.status);
    }
    if (query.decision) {
      results = results.filter(t => t.decision === query.decision);
    }
    if (query.cardholderName) {
      results = results.filter(t => t.cardholderName.toLowerCase().includes(query.cardholderName.toLowerCase()));
    }
    if (query.riskScore && query.riskScore.$gte) {
      results = results.filter(t => t.riskScore >= query.riskScore.$gte);
    }

    // Sort logic
    if (sort && sort.createdAt) {
      results.sort((a, b) => {
        const order = sort.createdAt === -1 ? -1 : 1;
        return (new Date(b.createdAt) - new Date(a.createdAt)) * order;
      });
    }

    // Limit logic
    if (limit > 0) {
      results = results.slice(0, limit);
    }

    return results;
  }

  static async findById(id) {
    if (!global.useMockDB) {
      try {
        return await MongoTransaction.findById(id);
      } catch (err) {}
    }
    return mockTransactions.find(t => t._id === id);
  }

  static async findByIdAndUpdate(id, update, options = { new: true }) {
    if (!global.useMockDB) {
      try {
        return await MongoTransaction.findByIdAndUpdate(id, update, options);
      } catch (err) {}
    }

    const index = mockTransactions.findIndex(t => t._id === id);
    if (index === -1) return null;

    // Apply updates
    const updatedTransaction = {
      ...mockTransactions[index],
      ...update,
      // Handle nested fields like $set if they come in
      ...(update.$set || {})
    };
    
    mockTransactions[index] = updatedTransaction;
    return updatedTransaction;
  }

  static async create(txData) {
    if (!global.useMockDB) {
      try {
        const tx = new MongoTransaction(txData);
        return await tx.save();
      } catch (err) {
        console.log("Mongoose save failed, saving to mock instead.");
      }
    }

    const newTx = {
      _id: 'tx_' + Math.random().toString(36).substr(2, 9),
      ...txData,
      createdAt: txData.createdAt || new Date()
    };
    mockTransactions.push(newTx);
    return newTx;
  }

  static async countDocuments(query = {}) {
    if (!global.useMockDB) {
      try {
        return await MongoTransaction.countDocuments(query);
      } catch (err) {}
    }
    
    let results = [...mockTransactions];
    if (query.status) {
      results = results.filter(t => t.status === query.status);
    }
    if (query.decision) {
      results = results.filter(t => t.decision === query.decision);
    }
    return results.length;
  }

  // Helper for seeder to replace entire list or append
  static setMockData(data) {
    mockTransactions = data;
  }

  static getMockData() {
    return mockTransactions;
  }
}

module.exports = TransactionModel;
