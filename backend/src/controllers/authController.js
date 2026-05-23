const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');

class AuthController {
  static async register(req, res) {
    const { username, password, email, role } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({ success: false, message: 'Please provide username, email, and password.' });
    }

    try {
      // Check if user already exists
      const existingUser = await UserModel.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Username is already taken.' });
      }

      const existingEmail = await UserModel.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'Email is already registered.' });
      }

      // Create new user (Role can only be admin if requested and permitted, or fallback to operator)
      const user = await UserModel.create({
        username,
        password,
        email,
        role: role || 'operator'
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully.',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Registration error:', error.message);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async login(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please provide username/email and password.' });
    }

    try {
      const isEmail = username.includes('@');
      const searchKey = isEmail ? { email: username } : { username };
      const user = await UserModel.findOne(searchKey);
      if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid username, email, or password.' });
      }

      // Check password
      const isMatch = await UserModel.comparePassword(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Invalid username, email, or password.' });
      }

      if (user.status === 'suspended') {
        return res.status(403).json({ success: false, message: 'Your account has been suspended.' });
      }

      // Generate JWT Token
      const token = jwt.sign(
        { id: user._id, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(200).json({
        success: true,
        message: 'Login successful.',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Login error:', error.message);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }

  static async getMe(req, res) {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.status(200).json({
        success: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

module.exports = AuthController;
