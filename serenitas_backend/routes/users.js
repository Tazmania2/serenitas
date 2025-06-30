const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Helper function to create wrapped response
const createResponse = (success, data, message = '', error = null) => {
  return {
    success,
    data,
    message,
    error
  };
};

// Get all users (admin only)
router.get('/', auth, async (req, res) => {
  try {
    // Only secretary can access all users
    if (req.user.role !== 'secretary') {
      return res.status(403).json(createResponse(false, null, 'Access denied', 'Insufficient permissions'));
    }
    
    const users = await User.find().select('-password');
    res.json(createResponse(true, users, 'Users retrieved successfully'));
  } catch (error) {
    res.status(500).json(createResponse(false, null, 'Server error', error.message));
  }
});

// Get user by ID
router.get('/:id', auth, async (req, res) => {
  try {
    // Users can only access their own data, or secretary can access any
    if (req.user._id !== req.params.id && req.user.role !== 'secretary') {
      return res.status(403).json(createResponse(false, null, 'Access denied', 'Insufficient permissions'));
    }
    
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json(createResponse(false, null, 'User not found', 'User does not exist'));
    }
    res.json(createResponse(true, user, 'User retrieved successfully'));
  } catch (error) {
    res.status(500).json(createResponse(false, null, 'Server error', error.message));
  }
});

// Update user
router.put('/:id', auth, async (req, res) => {
  try {
    // Users can only update their own data, or secretary can update any
    if (req.user._id !== req.params.id && req.user.role !== 'secretary') {
      return res.status(403).json(createResponse(false, null, 'Access denied', 'Insufficient permissions'));
    }
    
    const { password, ...updateData } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
    if (!user) {
      return res.status(404).json(createResponse(false, null, 'User not found', 'User does not exist'));
    }
    res.json(createResponse(true, user, 'User updated successfully'));
  } catch (error) {
    res.status(400).json(createResponse(false, null, 'Bad request', error.message));
  }
});

// Delete user (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Only secretary can delete users
    if (req.user.role !== 'secretary') {
      return res.status(403).json(createResponse(false, null, 'Access denied', 'Insufficient permissions'));
    }
    
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json(createResponse(false, null, 'User not found', 'User does not exist'));
    }
    res.json(createResponse(true, null, 'User deleted successfully'));
  } catch (error) {
    res.status(500).json(createResponse(false, null, 'Server error', error.message));
  }
});

module.exports = router; 