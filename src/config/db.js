const mongoose = require('mongoose');

let memoryServer = null;

const startMemoryMongo = async () => {
  // Lazy require so production installs don't need this dep
  const { MongoMemoryServer } = require('mongodb-memory-server');
  console.log('\nStarting embedded in-memory MongoDB (first run downloads ~70MB)...');
  memoryServer = await MongoMemoryServer.create({
    instance: { dbName: 'ds_store' },
  });
  const uri = memoryServer.getUri();
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('In-memory MongoDB ready (data resets on restart)');
  return true;
};

const autoSeedIfEmpty = async () => {
  try {
    const User = require('../models/User');
    const count = await User.countDocuments();
    if (count > 0) return;
    console.log('Database is empty - auto-seeding dummy data...');
    const { seedDatabase } = require('../utils/seed');
    await seedDatabase();
    console.log('Auto-seed completed.\n');
  } catch (err) {
    console.error('Auto-seed failed:', err.message);
  }
};

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000,
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
    await autoSeedIfEmpty();
    return;
  } catch (error) {
    console.warn(
      `\nLocal MongoDB at "${uri}" is not reachable: ${error.message}`
    );
  }

  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to fall back to in-memory DB in production.');
    process.exit(1);
  }

  try {
    await startMemoryMongo();
    await autoSeedIfEmpty();
  } catch (err) {
    console.error('Failed to start embedded MongoDB:', err.message);
    console.error(
      '\nFix options:\n' +
        '  1) Install MongoDB Community Server and run mongod, OR\n' +
        '  2) Use MongoDB Atlas: set MONGO_URI in server/.env to the Atlas URI\n'
    );
    process.exit(1);
  }
};

const stopMemoryMongo = async () => {
  if (memoryServer) {
    await mongoose.disconnect();
    await memoryServer.stop();
  }
};

module.exports = connectDB;
module.exports.stopMemoryMongo = stopMemoryMongo;
