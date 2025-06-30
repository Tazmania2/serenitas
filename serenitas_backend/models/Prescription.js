const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  dosage: {
    type: String,
    required: true
  },
  frequency: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  instructions: String,
  isTaken: {
    type: Boolean,
    default: false
  },
  lastTaken: Date,
  nextDose: String
});

const prescriptionSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  medications: [medicationSchema],
  instructions: String,
  duration: {
    type: Number, // in days
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'discontinued'],
    default: 'active'
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  patientNotes: String,
  doctorNotes: String
}, { timestamps: true });

module.exports = mongoose.model('Prescription', prescriptionSchema); 