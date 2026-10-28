const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let replSet;

/**
 * Connect to an in-memory MongoDB Replica Set.
 * Ensures transactions and replica set features (e.g., $inc concurrency guard) function properly.
 */
async function connectTestDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  replSet = await MongoMemoryReplSet.create({
    replSet: {
      count: 1,
      storageEngine: 'wiredTiger',
    },
  });

  const uri = replSet.getUri();
  await mongoose.connect(uri);
  return { replSet, uri };
}

/**
 * Disconnect mongoose and shut down the in-memory Replica Set.
 */
async function disconnectTestDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (replSet) {
    await replSet.stop();
    replSet = null;
  }
}

/**
 * Clean up collections between tests.
 */
async function clearTestDB() {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      if (Object.prototype.hasOwnProperty.call(collections, key)) {
        await collections[key].deleteMany({});
      }
    }
  }
}

module.exports = {
  connectTestDB,
  disconnectTestDB,
  clearTestDB,
};
