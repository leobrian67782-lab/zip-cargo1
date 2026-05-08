const ActivityLog = require('../models/ActivityLog');

const log = async (req, action, detail = '') => {
  try {
    await ActivityLog.create({
      adminId:  req.admin?._id || null,
      username: req.admin?.username || 'system',
      action,
      detail,
      ip: req.ip || '',
    });
  } catch (e) {
    console.error('Activity log error:', e.message);
  }
};

module.exports = log;
