const express = require('express');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
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

// Get all doctors
router.get('/', auth, async (req, res) => {
  try {
    const doctors = await Doctor.find().populate('userId', 'name email phone');
    res.json(createResponse(true, doctors, 'Doctors retrieved successfully'));
  } catch (error) {
    res.status(500).json(createResponse(false, null, 'Server error', error.message));
  }
});

// Get doctor by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate('userId', 'name email phone');
    if (!doctor) {
      return res.status(404).json(createResponse(false, null, 'Doctor not found', 'Doctor does not exist'));
    }
    res.json(createResponse(true, doctor, 'Doctor retrieved successfully'));
  } catch (error) {
    res.status(500).json(createResponse(false, null, 'Server error', error.message));
  }
});

// Get doctor's patients
router.get('/:id/patients', auth, async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json(createResponse(false, null, 'Doctor not found', 'Doctor does not exist'));
    }
    
    const patients = await Patient.find({ _id: { $in: doctor.patients } })
      .populate('userId', 'name email phone');
    res.json(createResponse(true, patients, 'Doctor patients retrieved successfully'));
  } catch (error) {
    res.status(500).json(createResponse(false, null, 'Server error', error.message));
  }
});

// Create new doctor
router.post('/', auth, async (req, res) => {
  try {
    const doctor = new Doctor(req.body);
    const newDoctor = await doctor.save();
    res.status(201).json(createResponse(true, newDoctor, 'Doctor created successfully'));
  } catch (error) {
    res.status(400).json(createResponse(false, null, 'Bad request', error.message));
  }
});

// Update doctor
router.put('/:id', auth, async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doctor) {
      return res.status(404).json(createResponse(false, null, 'Doctor not found', 'Doctor does not exist'));
    }
    res.json(createResponse(true, doctor, 'Doctor updated successfully'));
  } catch (error) {
    res.status(400).json(createResponse(false, null, 'Bad request', error.message));
  }
});

// Delete doctor
router.delete('/:id', auth, async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndDelete(req.params.id);
    if (!doctor) {
      return res.status(404).json(createResponse(false, null, 'Doctor not found', 'Doctor does not exist'));
    }
    res.json(createResponse(true, null, 'Doctor deleted successfully'));
  } catch (error) {
    res.status(500).json(createResponse(false, null, 'Server error', error.message));
  }
});

module.exports = router;

 