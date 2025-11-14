const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  role: {
    type: String,
    enum: ['patient', 'doctor', 'secretary', 'admin'],
    default: 'patient',
  },
  lastLoginAt: { type: Date },
  deletionScheduled: { type: Boolean, default: false },
  deletionDate: { type: Date },
  deletionRequestedAt: { type: Date },
  deletionNotifiedAt: { type: Date },
  deletedAt: { type: Date },
  deletionReason: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema); 