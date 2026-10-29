const mongoose = require('mongoose');

const boardingRecordSchema = new mongoose.Schema(
  {
    // Diagram: Booking 1 -- 0..1 BoardingRecord
    // unique = Invariant 2: one BoardingRecord per booking, enforced by MongoDB
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
    },

    // The departure where the check happened (not the snapshot)
    departureId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    // Who checked the ticket (the brief requires it; missing from the diagram)
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    // Diagram: checkedAt. Comes from the injected clock, never from the client
    checkedAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

const BoardingRecord = mongoose.models.BoardingRecord || mongoose.model('BoardingRecord', boardingRecordSchema);
module.exports = { BoardingRecord };