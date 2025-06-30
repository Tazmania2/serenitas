const express = require('express');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
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

// Get all appointments
router.get('/', auth, async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate('patientId', 'userId')
      .populate('doctorId', 'userId')
      .populate('patientId.userId', 'name email')
      .populate('doctorId.userId', 'name email');
    res.json(createResponse(true, appointments, 'Appointments retrieved successfully'));
  } catch (error) {
    res.status(500).json(createResponse(false, null, 'Server error', error.message));
  }
});

// Get appointment by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patientId', 'userId')
      .populate('doctorId', 'userId')
      .populate('patientId.userId', 'name email')
      .populate('doctorId.userId', 'name email');
    if (!appointment) {
      return res.status(404).json(createResponse(false, null, 'Appointment not found', 'Appointment does not exist'));
    }
    res.json(createResponse(true, appointment, 'Appointment retrieved successfully'));
  } catch (error) {
    res.status(500).json(createResponse(false, null, 'Server error', error.message));
  }
});

// Create new appointment
router.post('/', auth, async (req, res) => {
  try {
    const appointment = new Appointment(req.body);
    const newAppointment = await appointment.save();
    res.status(201).json(createResponse(true, newAppointment, 'Appointment created successfully'));
  } catch (error) {
    res.status(400).json(createResponse(false, null, 'Bad request', error.message));
  }
});

// Update appointment
router.put('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!appointment) {
      return res.status(404).json(createResponse(false, null, 'Appointment not found', 'Appointment does not exist'));
    }
    res.json(createResponse(true, appointment, 'Appointment updated successfully'));
  } catch (error) {
    res.status(400).json(createResponse(false, null, 'Bad request', error.message));
  }
});

// Delete appointment
router.delete('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    if (!appointment) {
      return res.status(404).json(createResponse(false, null, 'Appointment not found', 'Appointment does not exist'));
    }
    res.json(createResponse(true, null, 'Appointment deleted successfully'));
  } catch (error) {
    res.status(500).json(createResponse(false, null, 'Server error', error.message));
  }
});

module.exports = router; 