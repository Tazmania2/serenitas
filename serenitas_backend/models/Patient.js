const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  medicalHistory: [String],
  allergies: [String],
  bloodType: String,
  height: Number,
  weight: Number,
  insuranceProvider: String,
  insuranceNumber: String
}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema); 