const express = require('express');
const router = express.Router();
const TransactionController = require('../controllers/transactionController');
const { verifyToken, isOperatorOrAdmin } = require('../middleware/auth');
const { transactionLimiter } = require('../middleware/rateLimiter');

// Process new transactions (simulates checkout API gateway)
// Rate limited to mitigate checkout carding attacks.
router.post('/process', transactionLimiter, TransactionController.processTransaction);

// Management views (JWT staff secured)
router.get('/', verifyToken, isOperatorOrAdmin, TransactionController.getTransactions);
router.get('/:id', verifyToken, isOperatorOrAdmin, TransactionController.getTransactionById);
router.put('/:id/status', verifyToken, isOperatorOrAdmin, TransactionController.updateStatus);

// Telegram Callback Webhook (Public API webhook endpoint)
router.post('/telegram-webhook', TransactionController.handleTelegramWebhook);

module.exports = router;
