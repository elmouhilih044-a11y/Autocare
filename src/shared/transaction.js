const mongoose = require('mongoose');

/**
 * Execute a unit of work within a MongoDB transaction (requires replica set).
 * @param {Function} work - An async function receiving the Mongoose session.
 * @returns {Promise<*>} Result of the work.
 */
async function withTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = { withTransaction };
