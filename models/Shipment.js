const mongoose = require('mongoose');

const trackingUpdateSchema = new mongoose.Schema({
  status:    { type: String, required: true },
  location:  { type: String, default: '' },
  note:      { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
}, { _id: true });

const shipmentSchema = new mongoose.Schema({
  tracking: { type: String, required: true, unique: true, index: true, trim: true, uppercase: true, maxlength: 50 },
  service:  { type: String, required: true, enum: ['Air Freight','Sea Freight','Road Transport','Express Delivery'], default: 'Air Freight' },
  sName:    { type: String, required: true, trim: true, maxlength: 100 },
  sPhone:   { type: String, default: '', trim: true, maxlength: 30 },
  sEmail:   { type: String, default: '', trim: true, lowercase: true, maxlength: 100 },
  origin:   { type: String, required: true, trim: true, maxlength: 150 },
  rName:    { type: String, required: true, trim: true, maxlength: 100 },
  rPhone:   { type: String, default: '', trim: true, maxlength: 30 },
  rEmail:   { type: String, default: '', trim: true, lowercase: true, maxlength: 100 },
  dest:     { type: String, required: true, trim: true, maxlength: 150 },
  desc:     { type: String, default: '', maxlength: 500 },
  weight:   { type: Number, default: 0, min: 0, max: 999999 },
  value:    { type: Number, default: 0, min: 0, max: 99999999 },
  cost:     { type: Number, default: 0, min: 0, max: 99999999 },
  eta:      { type: String, default: '', maxlength: 100 },
  status:   { type: String, enum: ['Pending','In Transit','Out for Delivery','Delivered','On Hold'], default: 'Pending', index: true },
  location: { type: String, default: '', maxlength: 150 },
  notes:    { type: String, default: '', maxlength: 1000 },
  timeline: [trackingUpdateSchema],
  createdAt:{ type: Date, default: Date.now, index: true },
  updatedAt:{ type: Date, default: Date.now },
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Only add timeline entry if NOT flagged to skip
shipmentSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  // Skip automatic timeline update if flagged (we handle it manually in routes)
  if (this.$skipTimelineUpdate) return next();
  if (this.isModified('status')) {
    this.timeline.push({
      status:    this.status,
      location:  this.location,
      note:      `Status updated to ${this.status}`,
      timestamp: new Date(),
    });
  }
  next();
});

shipmentSchema.virtual('date').get(function () {
  return this.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
});

module.exports = mongoose.model('Shipment', shipmentSchema);
