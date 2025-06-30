const express = require('express');
const MoodEntry = require('../models/MoodEntry');
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

// Get all mood entries
router.get('/', auth, async (req, res) => {
  try {
    const moodEntries = await MoodEntry.find()
      .populate('patientId', 'userId')
      .populate('patientId.userId', 'name email');
    res.json(createResponse(true, moodEntries, 'Mood entries retrieved successfully'));
  } catch (error) {
    res.status(500).json(createResponse(false, null, 'Server error', error.message));
  }
});

// Get mood entry by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const moodEntry = await MoodEntry.findById(req.params.id)
      .populate('patientId', 'userId')
      .populate('patientId.userId', 'name email');
    if (!moodEntry) {
      return res.status(404).json(createResponse(false, null, 'Mood entry not found', 'Mood entry does not exist'));
    }
    res.json(createResponse(true, moodEntry, 'Mood entry retrieved successfully'));
  } catch (error) {
    res.status(500).json(createResponse(false, null, 'Server error', error.message));
  }
});

// Create new mood entry
router.post('/', auth, async (req, res) => {
  try {
    const moodEntry = new MoodEntry(req.body);
    const newMoodEntry = await moodEntry.save();
    res.status(201).json(createResponse(true, newMoodEntry, 'Mood entry created successfully'));
  } catch (error) {
    res.status(400).json(createResponse(false, null, 'Bad request', error.message));
  }
});

// Update mood entry
router.put('/:id', auth, async (req, res) => {
  try {
    const moodEntry = await MoodEntry.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!moodEntry) {
      return res.status(404).json(createResponse(false, null, 'Mood entry not found', 'Mood entry does not exist'));
    }
    res.json(createResponse(true, moodEntry, 'Mood entry updated successfully'));
  } catch (error) {
    res.status(400).json(createResponse(false, null, 'Bad request', error.message));
  }
});

// Delete mood entry
router.delete('/:id', auth, async (req, res) => {
  try {
    const moodEntry = await MoodEntry.findByIdAndDelete(req.params.id);
    if (!moodEntry) {
      return res.status(404).json(createResponse(false, null, 'Mood entry not found', 'Mood entry does not exist'));
    }
    res.json(createResponse(true, null, 'Mood entry deleted successfully'));
  } catch (error) {
    res.status(500).json(createResponse(false, null, 'Server error', error.message));
  }
});

module.exports = router; 