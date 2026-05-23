const mongoose = require('mongoose');

const RuleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  type: { type: String, enum: ['amount_limit', 'velocity_limit', 'country_blacklist', 'device_risk_threshold'], required: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true }, // number, array, or string
  isActive: { type: Boolean, default: true },
  action: { type: String, enum: ['FLAGGED', 'BLOCKED'], default: 'FLAGGED' },
  updatedAt: { type: Date, default: Date.now }
});

const MongoRule = mongoose.model('Rule', RuleSchema);

// Mock storage
let mockRules = [
  {
    _id: 'rule_1',
    name: 'High-Value Transaction Monitor',
    description: 'Flag any transaction greater than $5,000 for manual review.',
    type: 'amount_limit',
    value: 5000,
    isActive: true,
    action: 'FLAGGED',
    updatedAt: new Date()
  },
  {
    _id: 'rule_2',
    name: 'Velocity Velocity Limits',
    description: 'Block transactions if card is used more than 5 times in 1 hour.',
    type: 'velocity_limit',
    value: 5,
    isActive: true,
    action: 'BLOCKED',
    updatedAt: new Date()
  },
  {
    _id: 'rule_3',
    name: 'High Risk Device Fingerprints',
    description: 'Block any transactions coming from a device with risk score > 0.85.',
    type: 'device_risk_threshold',
    value: 0.85,
    isActive: true,
    action: 'BLOCKED',
    updatedAt: new Date()
  },
  {
    _id: 'rule_4',
    name: 'Sanctioned Country Blacklist',
    description: 'Flag transactions coming from high risk geographical locations.',
    type: 'country_blacklist',
    value: ['North Korea', 'Iran', 'Syria', 'Crimea'],
    isActive: true,
    action: 'BLOCKED',
    updatedAt: new Date()
  }
];

class RuleModel {
  static getMongoModel() {
    return MongoRule;
  }

  static async find(query = {}) {
    if (!global.useMockDB) {
      try {
        const rules = await MongoRule.find(query);
        // If MongoDB contains no rules, return our defaults
        if (rules && rules.length > 0) return rules;
      } catch (err) {}
    }
    return mockRules;
  }

  static async findById(id) {
    if (!global.useMockDB) {
      try {
        return await MongoRule.findById(id);
      } catch (err) {}
    }
    return mockRules.find(r => r._id === id);
  }

  static async findByIdAndUpdate(id, update, options = { new: true }) {
    if (!global.useMockDB) {
      try {
        return await MongoRule.findByIdAndUpdate(id, update, options);
      } catch (err) {}
    }

    const index = mockRules.findIndex(r => r._id === id);
    if (index === -1) return null;

    mockRules[index] = {
      ...mockRules[index],
      ...update,
      updatedAt: new Date()
    };
    return mockRules[index];
  }

  static async create(ruleData) {
    if (!global.useMockDB) {
      try {
        const rule = new MongoRule(ruleData);
        return await rule.save();
      } catch (err) {}
    }

    const newRule = {
      _id: 'rule_' + Math.random().toString(36).substr(2, 9),
      ...ruleData,
      updatedAt: new Date()
    };
    mockRules.push(newRule);
    return newRule;
  }
}

module.exports = RuleModel;
