const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_fraud_shield_key';

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access Denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    
    // Look up user (handles Mongoose or Mock)
    const user = await UserModel.findById(verified.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token. User not found.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'Your account has been suspended.' });
    }

    // Attach user to request
    req.user = {
      id: user._id,
      username: user.username,
      role: user.role,
      email: user.email
    };
    
    next();
  } catch (error) {
    res.status(403).json({ success: false, message: 'Invalid or expired token.' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied. Administrator privileges required.' });
  }
};

const isOperatorOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'operator' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied. Staff privileges required.' });
  }
};

module.exports = {
  verifyToken,
  isAdmin,
  isOperatorOrAdmin,
  JWT_SECRET
};
