const mongoose = require('mongoose');

const moodEntrySchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  mood: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  notes: String,
  activities: [String],
  sleepHours: {
    type: Number,
    min: 0,
    max: 24
  },
  stressLevel: {
    type: Number,
    min: 1,
    max: 5
  },
  anxietyLevel: {
    type: Number,
    min: 1,
    max: 5
  },
  depressionLevel: {
    type: Number,
    min: 1,
    max: 5
  },
  medicationTaken: {
    type: Boolean,
    default: false
  },
  exerciseMinutes: Number,
  socialInteraction: {
    type: String,
    enum: ['none', 'minimal', 'moderate', 'high']
  }
}, { timestamps: true });

module.exports = mongoose.model('MoodEntry', moodEntrySchema); 