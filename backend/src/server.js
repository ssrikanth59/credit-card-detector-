require('dotenv').config();
const app = require('./app');
const TelegramService = require('./services/telegramService');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`FraudShield AI Backend listening on Port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Url: http://localhost:${PORT}`);
  console.log(`==================================================`);
  
  // Start local Telegram Bot polling client
  TelegramService.startPolling();
});

process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection Details: ${err.message}`);
  // Keep server running in development fallback modes
});
