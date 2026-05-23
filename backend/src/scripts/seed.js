const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const TransactionModel = require('../models/Transaction');
const UserModel = require('../models/User');
const RuleModel = require('../models/Rule');

const cardholders = [
  'John Doe',
  'Jane Smith',
  'Alice Johnson',
  'Bob Miller',
  'Charlie Brown',
  'Sarah Connor',
  'David Lightman',
  'Bruce Wayne',
  'Clark Kent',
  'Diana Prince'
];

const merchants = [
  { name: 'Amazon.com', cat: 'Retail' },
  { name: 'Steam Games', cat: 'Entertainment' },
  { name: 'Uber Trips', cat: 'Travel' },
  { name: 'Walmart Stores', cat: 'Retail' },
  { name: 'Apple Store', cat: 'Retail' },
  { name: 'Shell Fuel', cat: 'Automotive' },
  { name: 'Netflix Subscription', cat: 'Entertainment' },
  { name: 'Whole Foods Market', cat: 'Groceries' },
  { name: 'Delta Airlines', cat: 'Travel' },
  { name: 'Best Buy Tech', cat: 'Retail' }
];

const devices = [
  { browser: 'Chrome', os: 'Windows 11', screenResolution: '1920x1080', language: 'en-US', hash: 'dev_win_chrome_9a2f' },
  { browser: 'Safari', os: 'macOS Sonoma', screenResolution: '2560x1600', language: 'en-US', hash: 'dev_mac_safari_7c1d' },
  { browser: 'Firefox', os: 'Ubuntu Linux', screenResolution: '1440x900', language: 'en-US', hash: 'dev_lin_firefox_4f8b' },
  { browser: 'Chrome Mobile', os: 'Android 14', screenResolution: '390x844', language: 'en-US', hash: 'dev_and_chrome_3d2a' },
  { browser: 'Safari Mobile', os: 'iOS 17.4', screenResolution: '393x852', language: 'en-US', hash: 'dev_ios_safari_1e0c' }
];

const locations = [
  { city: 'New York', country: 'US', lat: 40.7128, lon: -74.0060 },
  { city: 'Los Angeles', country: 'US', lat: 34.0522, lon: -118.2437 },
  { city: 'London', country: 'UK', lat: 51.5074, lon: -0.1278 },
  { city: 'Paris', country: 'FR', lat: 48.8566, lon: 2.3522 },
  { city: 'Tokyo', country: 'JP', lat: 35.6762, lon: 139.6503 },
  { city: 'Lagos', country: 'NG', lat: 6.5244, lon: 3.3792 },
  { city: 'Sydney', country: 'AU', lat: -33.8688, lon: 151.2093 }
];

const explanationPool = {
  amount: [
    { feature: 'amount', value: 1250.0, contribution: 0.8, importance: 0.25, percentage: 40.0 },
    { feature: 'distance_from_home', value: 12.5, contribution: 0.1, importance: 0.20, percentage: 5.0 }
  ],
  distance: [
    { feature: 'distance_from_home', value: 850.4, contribution: 1.2, importance: 0.20, percentage: 55.0 },
    { feature: 'amount', value: 45.0, contribution: 0.05, importance: 0.25, percentage: 2.5 }
  ],
  device: [
    { feature: 'device_risk_score', value: 0.95, contribution: 1.1, importance: 0.18, percentage: 50.0 },
    { feature: 'velocity_1h', value: 1, contribution: 0.05, importance: 0.15, percentage: 2.3 }
  ],
  velocity: [
    { feature: 'velocity_1h', value: 5, contribution: 0.9, importance: 0.15, percentage: 42.0 },
    { feature: 'device_risk_score', value: 0.2, contribution: 0.1, importance: 0.18, percentage: 4.7 }
  ]
};

function generateSeededTransactions() {
  const seeded = [];
  const now = new Date();

  // Create 100 transactions spread over 10 days
  for (let i = 99; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 2.4 * 60 * 60 * 1000); // spread over 10 days
    const cardholder = cardholders[Math.floor(Math.random() * cardholders.length)];
    const merchant = merchants[Math.floor(Math.random() * merchants.length)];
    
    // 85% normal, 15% suspicious
    const isSuspicious = Math.random() < 0.15;
    
    let amount = parseFloat((Math.random() * 85 + 5).toFixed(2));
    let distance = parseFloat((Math.random() * 25).toFixed(2));
    let velocity = Math.floor(Math.random() * 2);
    let devRisk = parseFloat((Math.random() * 0.15).toFixed(2));
    let declines = 0;
    let loc = locations[Math.floor(Math.random() * 5)]; // US, UK, FR, JP
    let device = devices[Math.floor(Math.random() * devices.length)];
    let foreign = loc.country !== 'US' ? 1 : 0;

    let riskScore = Math.floor(Math.random() * 15) + 2; // low baseline risk (2 - 17)
    let decision = 'APPROVED';
    let status = 'APPROVED';
    let explanation = [
      { feature: 'amount', value: amount, contribution: amount * 0.001, importance: 0.25, percentage: 20 },
      { feature: 'device_risk_score', value: devRisk, contribution: devRisk * 0.1, importance: 0.18, percentage: 15 },
      { feature: 'distance_from_home', value: distance, contribution: distance * 0.005, importance: 0.20, percentage: 10 }
    ];

    if (isSuspicious) {
      // Choose a fraud archetype
      const archetype = Math.random();
      if (archetype < 0.25) {
        // High amount
        amount = parseFloat((Math.random() * 4000 + 950).toFixed(2));
        riskScore = Math.floor(Math.random() * 30) + 60; // 60-90
        explanation = [...explanationPool.amount];
      } else if (archetype < 0.50) {
        // High distance
        distance = parseFloat((Math.random() * 1200 + 400).toFixed(2));
        loc = locations[5] || locations[6]; // Lagos or Sydney
        foreign = 1;
        riskScore = Math.floor(Math.random() * 25) + 65; // 65-90
        explanation = [...explanationPool.distance];
      } else if (archetype < 0.75) {
        // Bad device fingerprint
        devRisk = parseFloat((Math.random() * 0.25 + 0.75).toFixed(2));
        device = { ...device, hash: 'suspicious_fprint_8x3c' };
        riskScore = Math.floor(Math.random() * 30) + 70; // 70-100
        explanation = [...explanationPool.device];
      } else {
        // High velocity
        velocity = Math.floor(Math.random() * 3) + 4; // 4 to 6
        riskScore = Math.floor(Math.random() * 30) + 55; // 55-85
        explanation = [...explanationPool.velocity];
      }

      // Decide status based on riskScore
      if (riskScore >= 75) {
        decision = 'BLOCKED';
        status = 'BLOCKED';
      } else {
        decision = 'FLAGGED';
        status = Math.random() < 0.4 ? 'APPROVED' : 'PENDING_REVIEW'; // some resolved, some pending
      }
    }

    // Mask card
    const rawCard = '411122223333' + Math.floor(1000 + Math.random() * 9000);
    const first4 = rawCard.substring(0, 4);
    const last4 = rawCard.substring(rawCard.length - 4);
    const maskedCard = `${first4}********${last4}`;

    seeded.push({
      _id: '5f00000000000000000000' + String(i).padStart(2, '0'),
      cardholderName: cardholder,
      cardNumber: maskedCard,
      amount,
      merchant: merchant.name,
      merchantCategory: merchant.cat,
      location: {
        city: loc.city,
        country: loc.country,
        latitude: loc.lat,
        longitude: loc.lon
      },
      deviceFingerprint: device,
      ipAddress: `192.168.1.${10 + (i % 200)}`,
      velocity_1h: velocity,
      device_risk_score: devRisk,
      distance_from_home: distance,
      is_declined_before: declines,
      hour_of_day: timestamp.getHours(),
      is_foreign: foreign,
      riskScore,
      decision,
      explanation,
      status,
      createdAt: timestamp
    });
  }

  return seeded;
}

async function runSeeder() {
  console.log('Generating seed transactions dataset...');
  const transactions = generateSeededTransactions();

  // Save JSON backup for Mock DB fallback mode
  const backupDir = path.join(__dirname, '..');
  const backupPath = path.join(backupDir, 'mock_transactions_seed.json');
  fs.writeFileSync(backupPath, JSON.stringify(transactions, null, 2));
  console.log(`Saved JSON backup to ${backupPath}`);

  // If DB uri is provided or MongoDB is reachable, save to MongoDB
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fraud_detection';
  
  try {
    console.log(`Connecting to MongoDB at ${mongoURI} to inject seed data...`);
    await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 2000 });
    
    // Clear collections
    await mongoose.connection.db.dropDatabase();
    console.log('Cleared database.');

    // Seed Admin User
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    await UserModel.create({
      username: 'admin',
      password: 'admin123', // UserModel.create hashes it internally
      email: 'admin@fraudshield.ai',
      role: 'admin',
      status: 'active'
    });
    console.log('Seeded User: admin / admin123');

    // Seed rules
    const defaultRules = [
      {
        name: 'High-Value Transaction Monitor',
        description: 'Flag any transaction greater than $5,000 for manual review.',
        type: 'amount_limit',
        value: 5000,
        isActive: true,
        action: 'FLAGGED'
      },
      {
        name: 'Velocity Limits',
        description: 'Block transactions if card is used more than 5 times in 1 hour.',
        type: 'velocity_limit',
        value: 5,
        isActive: true,
        action: 'BLOCKED'
      },
      {
        name: 'High Risk Device Fingerprints',
        description: 'Block any transactions coming from a device with risk score > 0.85.',
        type: 'device_risk_threshold',
        value: 0.85,
        isActive: true,
        action: 'BLOCKED'
      },
      {
        name: 'Sanctioned Country Blacklist',
        description: 'Flag transactions coming from high risk geographical locations.',
        type: 'country_blacklist',
        value: ['North Korea', 'Iran', 'Syria', 'Crimea'],
        isActive: true,
        action: 'BLOCKED'
      }
    ];
    
    const Rule = RuleModel.getMongoModel();
    await Rule.insertMany(defaultRules);
    console.log('Seeded 4 default rules.');

    // Seed transactions
    const Transaction = TransactionModel.getMongoModel();
    await Transaction.insertMany(transactions);
    console.log(`Seeded ${transactions.length} transaction records.`);

    await mongoose.disconnect();
    console.log('Seeding completed successfully. Database connection closed.');
  } catch (err) {
    console.log('--------------------------------------------------');
    console.log('Could not seed MongoDB (DB connection failed/timed out).');
    console.log('JSON backup is written. Backend will load data dynamically on boot.');
    console.log('--------------------------------------------------');
  }
}

if (require.main === module) {
  runSeeder();
}
