const rateLimit = require('express-rate-limit');

// Limiter for authentication endpoints (login/signup)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Limiter for payment/transaction processing (mitigate carding attacks)
const transactionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100, // limit each IP to 100 transactions per 10 minutes
  message: {
    success: false,
    message: 'Transaction submission rate limit exceeded. Please wait before submitting more charges.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
  transactionLimiter
};
