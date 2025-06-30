const express = require('express');
const Exam = require('../models/Exam');
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

// Get all exams
router.get('/', auth, async (req, res) => {
  try {
    const exams = await Exam.find()
      .populate('patientId', 'userId')
      .populate('doctorId', 'userId')
      .populate('patientId.userId', 'name email')
      .populate('doctorId.userId', 'name email');
    res.json(createResponse(true, exams, 'Exams retrieved successfully'));
  } catch (error) {
    res.status(500).json(createResponse(false, null, 'Server error', error.message));
  }
});

// Get exam by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('patientId', 'userId')
      .populate('doctorId', 'userId')
      .populate('patientId.userId', 'name email')
      .populate('doctorId.userId', 'name email');
    if (!exam) {
      return res.status(404).json(createResponse(false, null, 'Exam not found', 'Exam does not exist'));
    }
    res.json(createResponse(true, exam, 'Exam retrieved successfully'));
  } catch (error) {
    res.status(500).json(createResponse(false, null, 'Server error', error.message));
  }
});

// Create new exam
router.post('/', auth, async (req, res) => {
  try {
    const exam = new Exam(req.body);
    const newExam = await exam.save();
    res.status(201).json(createResponse(true, newExam, 'Exam created successfully'));
  } catch (error) {
    res.status(400).json(createResponse(false, null, 'Bad request', error.message));
  }
});

// Update exam
router.put('/:id', auth, async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!exam) {
      return res.status(404).json(createResponse(false, null, 'Exam not found', 'Exam does not exist'));
    }
    res.json(createResponse(true, exam, 'Exam updated successfully'));
  } catch (error) {
    res.status(400).json(createResponse(false, null, 'Bad request', error.message));
  }
});

// Delete exam
router.delete('/:id', auth, async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) {
      return res.status(404).json(createResponse(false, null, 'Exam not found', 'Exam does not exist'));
    }
    res.json(createResponse(true, null, 'Exam deleted successfully'));
  } catch (error) {
    res.status(500).json(createResponse(false, null, 'Server error', error.message));
  }
});

module.exports = router; 