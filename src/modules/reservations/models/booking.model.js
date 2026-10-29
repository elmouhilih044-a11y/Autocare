const mongoose = require('mongoose');
const { BOOKING_STATUS, CANCEL_REASON } = require('./booking.constants');

const bookingSchema = new mongoose.Schema(
  {
    passengerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    departureId: { type: mongoose.Schema.Types.ObjectId, required: true },
    seatNumber: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isInteger,
    },
    passengerName: { type: String, required: true, trim: true },
    priceCents: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
    ticketCode: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.CONFIRMED,
    },
    occupiesSeat: { type: Boolean, default: true },
    cancelReason: {
      type: String,
      enum: Object.values(CANCEL_REASON),
      default: null,
    },
    boardedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

bookingSchema.index({ ticketCode: 1 }, { unique: true });
bookingSchema.index(
  { departureId: 1, seatNumber: 1 },
  { unique: true, partialFilterExpression: { occupiesSeat: true } }
);
bookingSchema.index(
  { departureId: 1, passengerId: 1 },
  { unique: true, partialFilterExpression: { occupiesSeat: true } }
);
bookingSchema.index({ passengerId: 1, createdAt: 1, _id: 1 });

const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);

module.exports = { Booking };
