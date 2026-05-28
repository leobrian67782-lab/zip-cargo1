const mongoose = require('mongoose');

const siteSettingsSchema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true, trim: true },
  value: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
});

siteSettingsSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
