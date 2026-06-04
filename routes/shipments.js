const mongoose = require('mongoose');

const trackingUpdateSchema = new mongoose.Schema({
  status:    { type: String, required: true },
  location:  { type: String, default: '' },
  note:      { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
}, { _id: true });

const shipmentSchema = new mongoose.Schema({
  tracking: { type: String, required: true, unique: true, index: true, trim: true, uppercase: true },
  service:  { type: String, required: true, enum: ['Air Freight','Sea Freight','Road Transport','Express Delivery'], default: 'Air Freight' },
  sName:    { type: String, required: true, trim: true },
  sPhone:   { type: String, default: '', trim: true },
  sEmail:   { type: String, default: '', trim: true, lowercase: true },
  origin:   { type: String, required: true, trim: true },
  rName:    { type: String, required: true, trim: true },
  rPhone:   { type: String, default: '', trim: true },
  rEmail:   { type: String, default: '', trim: true, lowercase: true },
  dest:     { type: String, required: true, trim: true },
  desc:     { type: String, default: '' },
  weight:   { type: Number, default: 0 },
  value:    { type: Number, default: 0 },
  cost:     { type: Number, default: 0 },
  eta:      { type: String, default: '' },
  status:   { type: String, enum: ['Pending','In Transit','Out for Delivery','Delivered','On Hold'], default: 'Pending', index: true },
  location: { type: String, default: '' },
  notes:    { type: String, default: '' },
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

// Performance indexes
shipmentSchema.index({ tracking: 1 });
shipmentSchema.index({ status: 1 });
shipmentSchema.index({ createdAt: -1 });
shipmentSchema.index({ rEmail: 1 });
shipmentSchema.index({ sEmail: 1 });
shipmentSchema.index({ status: 1, createdAt: -1 }); // compound for dashboard
shipmentSchema.index({ rName: 'text', sName: 'text', tracking: 'text', desc: 'text' }); // full text search

module.exports = mongoose.model('Shipment', shipmentSchema);
