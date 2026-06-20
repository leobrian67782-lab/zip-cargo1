const mongoose = require('mongoose');

// Each notification is its own document — unlike AiSettings, this isn't a
// singleton. Storing them server-side (rather than localStorage) means
// every admin device/browser sees the same notification history, and we
// can generate notifications precisely when something happens server-side
// instead of guessing from polled count differences.
const notificationSchema = new mongoose.Schema({
  type:  { type: String, enum: ['inquiry', 'review', 'shipment', 'status', 'delivered', 'hold'], required: true },
  title: { type: String, required: true, maxlength: 200 },
  desc:  { type: String, default: '', maxlength: 300 },
  link:  { type: String, default: '' }, // e.g. "section:inquiries"
  read:  { type: Boolean, default: false, index: true },
  date:  { type: Date, default: Date.now, index: true },
});

// Helper: create a notification (called from other routes when something
// notification-worthy happens — new inquiry, new review, new shipment, etc.)
notificationSchema.statics.push = async function (type, title, desc, link) {
  try {
    // Defensively truncate here too — even if a caller forgets to slice
    // their string before passing it in, a too-long title/desc should
    // never cause the whole notification to silently fail validation.
    await this.create({
      type,
      title: String(title || '').slice(0, 200),
      desc: String(desc || '').slice(0, 300),
      link: link || '',
    });
    // Keep the collection from growing forever — retain the most recent 200.
    const count = await this.countDocuments();
    if (count > 200) {
      const excess = await this.find().sort({ date: 1 }).limit(count - 200).select('_id');
      await this.deleteMany({ _id: { $in: excess.map(d => d._id) } });
    }
  } catch (e) {
    console.error('Notification.push error:', e.message);
  }
};

module.exports = mongoose.model('Notification', notificationSchema);
