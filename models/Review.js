const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true, maxlength: 200 },
  company:   { type: String, default: '', trim: true, maxlength: 200 },
  rating:    { type: Number, required: true, min: 1, max: 5 },
  message:   { type: String, required: true, trim: true, maxlength: 1000 },
  // Optional customer photo, stored as a base64 data URL (e.g. "data:image/jpeg;base64,...").
  // Capped well under MongoDB's 16MB document limit — see size validation in the route.
  photo:     { type: String, default: '' },
  status:    { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  date:      { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model('Review', reviewSchema);
