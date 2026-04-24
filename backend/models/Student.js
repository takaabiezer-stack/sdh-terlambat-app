const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  nis: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  class: { type: String, required: true, trim: true },
  grade: { type: String, required: true, trim: true },
  parentName: { type: String, required: true, trim: true },
  parentPhone: { type: String, required: true, trim: true },
  parentEmail: { type: String, trim: true, lowercase: true, default: '' },
  address: { type: String, default: '' },
  photo: { type: String, default: null },
  isActive: { type: Boolean, default: true },
  isArchived: { type: Boolean, default: false },
}, { timestamps: true });

studentSchema.index({ name: 'text' });
studentSchema.index({ class: 1, grade: 1 });

module.exports = mongoose.model('Student', studentSchema);
