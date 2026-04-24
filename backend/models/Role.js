const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  displayName: { type: String, required: true },
  permissions: [{
    type: String,
    enum: [
      'attendance:create', 'attendance:read', 'attendance:update', 'attendance:delete',
      'student:create', 'student:read', 'student:update', 'student:delete', 'student:import', 'student:export',
      'sanction:create', 'sanction:read', 'sanction:update', 'sanction:delete',
      'report:read', 'report:export',
      'setting:read', 'setting:update', 'setting:branding',
      'user:create', 'user:read', 'user:update', 'user:delete',
      'role:create', 'role:read', 'role:update', 'role:delete',
      'parent-call:create', 'parent-call:read', 'parent-call:generate',
      'audit:read',
    ]
  }],
  isSystem: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Role', roleSchema);
