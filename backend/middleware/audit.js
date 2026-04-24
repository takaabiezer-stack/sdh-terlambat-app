const AuditLog = require('../models/AuditLog');

const auditLog = (action, resourceType) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = async (data) => {
    if (data?.success !== false) {
      try {
        await AuditLog.create({
          action,
          user: req.user?._id || null,
          resourceType,
          resourceId: req.params?.id || data?.data?._id || null,
          changes: req.body || null,
          ipAddress: req.ip,
        });
      } catch (err) {
        console.error('Audit log error:', err.message);
      }
    }
    return originalJson(data);
  };
  next();
};

module.exports = auditLog;
