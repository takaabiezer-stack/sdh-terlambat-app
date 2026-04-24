const mongoose = require('mongoose');

const parentCallSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  triggeredDate: { type: Date, required: true },
  period: { type: String, required: true },
  totalTardiness: { type: Number, required: true },
  tardinessDates: [{ type: Date }],
  sanctionsAssigned: [{ type: String }],
  reason: { type: String, default: '' },
  notes: { type: String, default: '' },
  letterGenerated: { type: Boolean, default: false },
  letterGeneratedAt: { type: Date, default: null },
  letterSentDate: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('ParentCall', parentCallSchema);
