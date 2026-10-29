const { BOOKING_STATUS, CANCEL_REASON } = require('../models/booking.constants');

function duplicateType(err) {
  if (err.code !== 11000) return null;
  const keys = err.keyPattern || {};
  if (keys.seatNumber) return 'SEAT';
  if (keys.passengerId) return 'PASSENGER';
  return 'TICKET_CODE';
}

class BookingRepository {
  constructor({ bookingModel }) {
    this.Booking = bookingModel;
  }

  async create(data, { session } = {}) {
    try {
      const [booking] = await this.Booking.create([data], { session });
      return booking.toObject();
    } catch (err) {
      err.duplicate = duplicateType(err);
      throw err;
    }
  }

  findById(id, { session } = {}) {
    return this.Booking.findById(id, null, { session }).lean();
  }

  findOwnedById(id, passengerId, { session } = {}) {
    return this.Booking.findOne({ _id: id, passengerId }, null, { session }).lean();
  }

  findByTicketCode(ticketCode, { session } = {}) {
    return this.Booking.findOne({ ticketCode }, null, { session }).lean();
  }

  async findOccupiedSeatNumbers(departureId, { session } = {}) {
    const bookings = await this.Booking.find(
      { departureId, occupiesSeat: true },
      'seatNumber',
      { session }
    ).lean();
    return bookings.map((booking) => booking.seatNumber);
  }

  async isSeatOccupied(departureId, seatNumber, { session } = {}) {
    const booking = await this.Booking.findOne(
      { departureId, seatNumber, occupiesSeat: true },
      '_id',
      { session }
    ).lean();
    return booking !== null;
  }

  async hasActiveBooking(departureId, passengerId, { session } = {}) {
    const booking = await this.Booking.findOne(
      { departureId, passengerId, occupiesSeat: true },
      '_id',
      { session }
    ).lean();
    return booking !== null;
  }

  async findPage(filter, { page = 1, limit = 20 } = {}, { session } = {}) {
    const data = await this.Booking.find(filter, null, { session })
      .sort({ createdAt: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    const total = await this.Booking.countDocuments(filter).session(session || null);
    return { data, total };
  }

  cancelIfConfirmed(id, cancelReason, { session } = {}) {
    return this.Booking.findOneAndUpdate(
      { _id: id, status: BOOKING_STATUS.CONFIRMED },
      {
        status: BOOKING_STATUS.CANCELLED,
        occupiesSeat: false,
        cancelReason,
      },
      { new: true, session }
    ).lean();
  }

  markBoardedIfConfirmed(id, boardedAt, { session } = {}) {
    return this.Booking.findOneAndUpdate(
      { _id: id, status: BOOKING_STATUS.CONFIRMED },
      { status: BOOKING_STATUS.BOARDED, boardedAt },
      { new: true, session }
    ).lean();
  }

  async cancelAllConfirmedByDeparture(departureId, { session } = {}) {
    const result = await this.Booking.updateMany(
      { departureId, status: BOOKING_STATUS.CONFIRMED },
      {
        status: BOOKING_STATUS.CANCELLED,
        occupiesSeat: false,
        cancelReason: CANCEL_REASON.DEPARTURE,
      },
      { session }
    );
    return result.modifiedCount;
  }
}

module.exports = { BookingRepository };
