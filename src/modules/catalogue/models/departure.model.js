const mongoose = require('mongoose');

const departureSchema = new mongoose.Schema(
  {
    lineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Line',
      required: true,
    },
    coachId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coach',
      required: true,
    },
    // Snapshots frozen at creation
    lineSnapshot: {
      code: { type: String, required: true },
      label: { type: String, required: true },
      stops: [{ type: mongoose.Schema.Types.Mixed }],
      stopIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Stop' }],
    },
    coachSnapshot: {
      registration: { type: String, required: true },
      seatPlan: [{ type: Number }],
    },
    seatPlan: [{ type: Number, required: true }],
    departureAt: { type: Date, required: true },
    arrivalAt: { type: Date, required: true },
    fareCents: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['OPEN', 'BOARDING', 'DEPARTED', 'CANCELLED'],
      default: 'OPEN',
    },
    revision: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Indexes specified in Task 2
departureSchema.index({ lineId: 1, departureAt: 1 });
departureSchema.index({ status: 1, departureAt: 1 });
departureSchema.index({ createdAt: 1, _id: 1 });

const Departure = mongoose.models.Departure || mongoose.model('Departure', departureSchema);

module.exports = Departure;
module.exports.Departure = Departure;
