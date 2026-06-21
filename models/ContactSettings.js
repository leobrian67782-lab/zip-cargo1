const mongoose = require('mongoose');

// Singleton-style settings document — there is only ever one of these.
// Previously this lived only in the admin's browser localStorage, which
// meant it never reached actual site visitors (each browser only sees
// its own localStorage) and never synced across admin devices either.
const contactSettingsSchema = new mongoose.Schema({
  phone:   { type: String, default: '', trim: true, maxlength: 50 },
  email:   { type: String, default: 'info@zipcargo.com', trim: true, maxlength: 200 },
  website: { type: String, default: 'https://zipcargologistics.com', trim: true, maxlength: 200 },
  hours:   { type: String, default: 'Available 24/7', trim: true, maxlength: 100 },

  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String, default: '' }, // admin username who last edited
});

contactSettingsSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Helper: always fetch (or lazily create) the single settings doc
contactSettingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne();
  if (!doc) {
    doc = await this.create({});
  }
  return doc;
};

module.exports = mongoose.model('ContactSettings', contactSettingsSchema);
