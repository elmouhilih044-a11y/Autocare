const mongoose = require('mongoose');

/**
 * Execute a unit of work within a MongoDB transaction.
 * @param {Function} work - An async function receiving the Mongoose session.
 * @returns {Promise<*>} Result of the work.
 */
async function withTransaction(work) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const result = await work(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

module.exports = { withTransaction };
