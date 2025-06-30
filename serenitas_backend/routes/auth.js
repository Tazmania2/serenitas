const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');

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

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json(createResponse(false, null, 'User already exists', 'Email already registered'));
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'patient',
      phone
    });

    await user.save();

    // Create role-specific profile if needed
    if (role === 'patient') {
      const patient = new Patient({
        userId: user._id,
        emergencyContact: {
          name: '',
          phone: '',
          relationship: ''
        }
      });
      await patient.save();
    } else if (role === 'doctor') {
      const doctor = new Doctor({
        userId: user._id,
        specialization: '',
        licenseNumber: '',
        patients: []
      });
      await doctor.save();
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Remove password from response
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.status(201).json(createResponse(true, {
      user: userResponse,
      token
    }, 'User registered successfully'));
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json(createResponse(false, null, 'Server error', error.message));
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json(createResponse(false, null, 'Invalid credentials', 'User not found'));
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json(createResponse(false, null, 'Invalid credentials', 'Invalid password'));
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Remove password from response
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json(createResponse(true, {
      user: userResponse,
      token
    }, 'Login successful'));
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json(createResponse(false, null, 'Server error', error.message));
  }
});

// Get profile
router.get('/profile', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json(createResponse(false, null, 'No token provided', 'Authentication required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json(createResponse(false, null, 'Invalid token', 'User not found'));
    }

    res.json(createResponse(true, user, 'Profile retrieved successfully'));
  } catch (error) {
    console.error('Profile error:', error);
    res.status(401).json(createResponse(false, null, 'Invalid token', error.message));
  }
});

module.exports = router; 