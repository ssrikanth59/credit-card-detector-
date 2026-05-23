const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Public routes
router.post('/register', AuthController.register);
router.post('/login', authLimiter, AuthController.login);

// Secure details route
router.get('/me', verifyToken, AuthController.getMe);

module.exports = router;
