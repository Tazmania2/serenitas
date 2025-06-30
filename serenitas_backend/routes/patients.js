const express = require('express');
const Patient = require('../models/Patient');
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

// Get all patients
router.get('/', auth, async (req, res) => {
  try {
    const patients = await Patient.find().populate('userId', 'name email phone');
    res.json(createResponse(true, patients, 'Patients retrieved successfully'));
  } catch (error) {
    res.status(500).json(createResponse(false, null, 'Server error', error.message));
  }
});

// Get patient by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).populate('userId', 'name email phone');
    if (!patient) {
      return res.status(404).json(createResponse(false, null, 'Patient not found', 'Patient does not exist'));
    }
    res.json(createResponse(true, patient, 'Patient retrieved successfully'));
  } catch (error) {
    res.status(500).json(createResponse(false, null, 'Server error', error.message));
  }
});

// Create new patient
router.post('/', auth, async (req, res) => {
  try {
    const patient = new Patient(req.body);
    const newPatient = await patient.save();
    res.status(201).json(createResponse(true, newPatient, 'Patient created successfully'));
  } catch (error) {
    res.status(400).json(createResponse(false, null, 'Bad request', error.message));
  }
});

// Update patient
router.put('/:id', auth, async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!patient) {
      return res.status(404).json(createResponse(false, null, 'Patient not found', 'Patient does not exist'));
    }
    res.json(createResponse(true, patient, 'Patient updated successfully'));
  } catch (error) {
    res.status(400).json(createResponse(false, null, 'Bad request', error.message));
  }
});

// Delete patient
router.delete('/:id', auth, async (req, res) => {
  try {
    const patient = await Patient.findByIdAndDelete(req.params.id);
    if (!patient) {
      return res.status(404).json(createResponse(false, null, 'Patient not found', 'Patient does not exist'));
    }
    res.json(createResponse(true, null, 'Patient deleted successfully'));
  } catch (error) {
    res.status(500).json(createResponse(false, null, 'Server error', error.message));
  }
});

module.exports = router; 