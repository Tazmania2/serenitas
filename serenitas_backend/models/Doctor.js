const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  specialization: {
    type: String,
    required: true
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true
  },
  patients: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient'
  }],
  availability: [{
    day: String,
    startTime: String,
    endTime: String
  }],
  consultationFee: Number,
  experience: Number, // years of experience
  education: [String],
  certifications: [String]
}, { timestamps: true });

module.exports = mongoose.model('Doctor', doctorSchema); 