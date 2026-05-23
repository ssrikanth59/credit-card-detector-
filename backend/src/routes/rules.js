const express = require('express');
const router = express.Router();
const RuleModel = require('../models/Rule');
const { verifyToken, isOperatorOrAdmin, isAdmin } = require('../middleware/auth');

// Get all rules
router.get('/', verifyToken, isOperatorOrAdmin, async (req, res) => {
  try {
    const rules = await RuleModel.find({});
    res.status(200).json({ success: true, rules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update a rule
router.put('/:id', verifyToken, isOperatorOrAdmin, async (req, res) => {
  const { value, isActive, action } = req.body;
  const update = {};
  
  if (typeof value !== 'undefined') update.value = value;
  if (typeof isActive !== 'undefined') update.isActive = isActive;
  if (action) update.action = action;

  try {
    const updated = await RuleModel.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Rule not found.' });
    }
    res.status(200).json({ success: true, message: 'Rule updated successfully.', rule: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create new rule (Admin only)
router.post('/', verifyToken, isAdmin, async (req, res) => {
  const { name, description, type, value, action, isActive } = req.body;

  if (!name || !type || typeof value === 'undefined') {
    return res.status(400).json({ success: false, message: 'Missing rule name, type or value.' });
  }

  try {
    const rule = await RuleModel.create({
      name,
      description,
      type,
      value,
      action: action || 'FLAGGED',
      isActive: typeof isActive !== 'undefined' ? isActive : true
    });
    res.status(201).json({ success: true, message: 'Rule created successfully.', rule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
