const mongoose = require('mongoose');

const attendanceSanctionSchema = new mongoose.Schema({
  sanction: { type: mongoose.Schema.Types.ObjectId, ref: 'Sanction', required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedAt: { type: Date, default: Date.now },
}, { _id: false });

const attendanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  date: { type: Date, required: true },
  arrivalTime: { type: Date, required: true },
  status: { type: String, enum: ['OnTime', 'Late', 'Absent', 'Excused'], required: true },
  tardinessMinutes: { type: Number, default: 0 },
  sanctions: [attendanceSanctionSchema],
  inputMethod: { type: String, enum: ['barcode', 'manual'], default: 'manual' },
  notes: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

attendanceSchema.index({ student: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ status: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
