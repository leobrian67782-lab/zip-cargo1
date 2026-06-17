const mongoose = require('mongoose');

// Singleton-style settings document — there is only ever one of these.
// We store everything needed to configure the AI assistant in one place
// so settings persist across devices, browsers, and admin logins.
const aiSettingsSchema = new mongoose.Schema({
  // Free-form instructions the admin wants the AI to actively communicate
  // (e.g. "Shipment ZC-2026-00123 is delayed, new ETA Friday")
  announcements: { type: String, default: '', maxlength: 4000 },

  // Explicit list of things the AI must NEVER say or discuss.
  // Stored as an array so each restriction is enforced as its own
  // high-priority rule rather than buried in a paragraph.
  restrictions: [{
    text:      { type: String, required: true, maxlength: 500 },
    createdAt: { type: Date, default: Date.now },
  }],

  // Optional knowledge admin wants the AI to know but not necessarily announce
  // (background info, internal context, nuance)
  knowledgeNotes: { type: String, default: '', maxlength: 4000 },

  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String, default: '' }, // admin username who last edited
});

aiSettingsSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Helper: always fetch (or lazily create) the single settings doc
aiSettingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne();
  if (!doc) {
    doc = await this.create({});
  }
  return doc;
};

module.exports = mongoose.model('AiSettings', aiSettingsSchema);
