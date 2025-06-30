const express = require('express');
const Prescription = require('../models/Prescription');
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

// Get all prescriptions
router.get('/', auth, async (req, res) => {
  try {
    const prescriptions = await Prescription.find()
      .populate('patientId', 'userId')
      .populate('doctorId', 'userId')
      .populate('patientId.userId', 'name email')
      .populate('doctorId.userId', 'name email');
    res.json(createResponse(true, prescriptions, 'Prescriptions retrieved successfully'));
  } catch (error) {
    res.status(500).json(createResponse(false, null, 'Server error', error.message));
  }
});

// Get prescription by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('patientId', 'userId')
      .populate('doctorId', 'userId')
      .populate('patientId.userId', 'name email')
      .populate('doctorId.userId', 'name email');
    if (!prescription) {
      return res.status(404).json(createResponse(false, null, 'Prescription not found', 'Prescription does not exist'));
    }
    res.json(createResponse(true, prescription, 'Prescription retrieved successfully'));
  } catch (error) {
    res.status(500).json(createResponse(false, null, 'Server error', error.message));
  }
});

// Create new prescription
router.post('/', auth, async (req, res) => {
  try {
    const prescription = new Prescription(req.body);
    const newPrescription = await prescription.save();
    res.status(201).json(createResponse(true, newPrescription, 'Prescription created successfully'));
  } catch (error) {
    res.status(400).json(createResponse(false, null, 'Bad request', error.message));
  }
});

// Update prescription
router.put('/:id', auth, async (req, res) => {
  try {
    const prescription = await Prescription.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!prescription) {
      return res.status(404).json(createResponse(false, null, 'Prescription not found', 'Prescription does not exist'));
    }
    res.json(createResponse(true, prescription, 'Prescription updated successfully'));
  } catch (error) {
    res.status(400).json(createResponse(false, null, 'Bad request', error.message));
  }
});

// Delete prescription
router.delete('/:id', auth, async (req, res) => {
  try {
    const prescription = await Prescription.findByIdAndDelete(req.params.id);
    if (!prescription) {
      return res.status(404).json(createResponse(false, null, 'Prescription not found', 'Prescription does not exist'));
    }
    res.json(createResponse(true, null, 'Prescription deleted successfully'));
  } catch (error) {
    res.status(500).json(createResponse(false, null, 'Server error', error.message));
  }
});

module.exports = router; 