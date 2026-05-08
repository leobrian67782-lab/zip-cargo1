const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () =>
  console.warn('⚠️  MongoDB disconnected. Reconnecting...')
);
mongoose.connection.on('reconnected', () =>
  console.log('✅ MongoDB reconnected.')
);

module.exports = connectDB;
