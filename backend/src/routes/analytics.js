const express = require('express');
const router = express.Router();
const AnalyticController = require('../controllers/analyticController');
const { verifyToken, isOperatorOrAdmin } = require('../middleware/auth');

router.get('/dashboard', verifyToken, isOperatorOrAdmin, AnalyticController.getDashboardMetrics);

module.exports = router;
