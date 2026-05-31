const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true, maxlength: 200 },
  email:   { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
  company: { type: String, default: '', trim: true, maxlength: 200 },
  service: { type: String, default: '', trim: true },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  read:    { type: Boolean, default: false },
  date:    { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model('Inquiry', inquirySchema);
