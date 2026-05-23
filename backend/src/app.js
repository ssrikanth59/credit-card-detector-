const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const analyticRoutes = require('./routes/analytics');
const ruleRoutes = require('./routes/rules');
const TransactionModel = require('./models/Transaction');

const app = express();

// Set security headers
app.use(helmet());

// Enable CORS
app.use(cors({
  origin: '*', // Allow all origins for dev simplicity
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request Logging
app.use(morgan('dev'));

// Parse JSON payloads
app.use(express.json());

// Initialize Database & Mock fallback loader
const initializeApp = async () => {
  await connectDB();

  // If in database fallback mode, load pre-seeded mock transactions from file
  if (global.useMockDB) {
    const backupPath = path.join(__dirname, 'mock_transactions_seed.json');
    if (fs.existsSync(backupPath)) {
      try {
        const raw = fs.readFileSync(backupPath, 'utf8');
        const transactions = JSON.parse(raw);
        TransactionModel.setMockData(transactions);
        console.log(`Loaded ${transactions.length} mock transactions from JSON backup.`);
      } catch (err) {
        console.error('Failed to load mock transactions backup:', err.message);
      }
    } else {
      console.log('No mock transactions JSON backup found. Run seeder to pre-populate mock data.');
    }
  }
};

initializeApp();

// API Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date(),
    databaseFallback: global.useMockDB ? 'IN-MEMORY MOCK' : 'MONGODB'
  });
});

// Routing
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/analytics', analyticRoutes);
app.use('/api/rules', ruleRoutes);

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'Resource not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

module.exports = app;
