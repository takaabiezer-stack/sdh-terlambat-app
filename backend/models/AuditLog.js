const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resourceType: { type: String, required: true },
  resourceId: { type: String, default: null },
  changes: { type: mongoose.Schema.Types.Mixed, default: null },
  ipAddress: { type: String, default: null },
  timestamp: { type: Date, default: Date.now },
});

auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ user: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
