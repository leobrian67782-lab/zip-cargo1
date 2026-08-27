const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  adminId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  username:  { type: String, default: 'system' },
  action:    { type: String, required: true },
  detail:    { type: String, default: '' },
  ip:        { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
});

activityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
