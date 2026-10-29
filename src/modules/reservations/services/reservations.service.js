const { AppError } = require('../../../shared/errors');
const { BOOKING_STATUS, CANCEL_REASON } = require('../models/booking.constants');
const errors = require('./reservations.errors');
const { toBookingView } = require('./booking.view');

class ReservationsService {
  constructor({
    bookingRepository,
    catalogueApi,
    ticketCodeGenerator,
    clock,
    transactionRunner,
  }) {
    this.bookingRepository = bookingRepository;
    this.catalogueApi = catalogueApi;
    this.ticketCodeGenerator = ticketCodeGenerator;
    this.clock = clock;
    this.transactionRunner = transactionRunner;
  }

  createBooking(user, departureId, seatNumber) {
    return this.transactionRunner(async (session) => {
      const departure = await this.catalogueApi.getDeparture(departureId, { session });
      if (departure.status !== 'OPEN' || departure.departureAt <= this.clock.now()) {
        throw errors.departureNotBookable();
      }
      if (!departure.seatPlan.includes(seatNumber)) {
        throw errors.seatNotInPlan();
      }

      await this.catalogueApi.guardDeparture(departureId, { session });

      if (await this.bookingRepository.hasActiveBooking(departureId, user.id, { session })) {
        throw errors.alreadyBooked();
      }
      if (await this.bookingRepository.isSeatOccupied(departureId, seatNumber, { session })) {
        throw errors.seatUnavailable();
      }

      try {
        const booking = await this.bookingRepository.create(
          {
            passengerId: user.id,
            departureId,
            seatNumber,
            passengerName: user.fullName || user.name || 'Passenger',
            priceCents: departure.fareCents,
            ticketCode: this.ticketCodeGenerator.generate(),
          },
          { session }
        );
        return toBookingView(booking);
      } catch (err) {
        if (err.duplicate === 'SEAT') throw errors.seatUnavailable();
        if (err.duplicate === 'PASSENGER') throw errors.alreadyBooked();
        throw err;
      }
    });
  }

  cancelBooking(user, bookingId) {
    return this.transactionRunner(async (session) => {
      const booking = await this.bookingRepository.findOwnedById(bookingId, user.id, {
        session,
      });
      if (!booking) throw errors.bookingNotFound();
      if (booking.status !== BOOKING_STATUS.CONFIRMED) {
        throw errors.bookingNotCancellable();
      }
      await this.guardOpenDeparture(booking.departureId, session);
      const cancelled = await this.bookingRepository.cancelIfConfirmed(
        bookingId,
        CANCEL_REASON.CUSTOMER,
        { session }
      );
      if (!cancelled) throw errors.bookingNotCancellable();
      return toBookingView(cancelled);
    });
  }

  async guardOpenDeparture(departureId, session) {
    try {
      await this.catalogueApi.guardDeparture(departureId, { session });
    } catch (err) {
      if (err.code === 'DEPARTURE_NOT_BOOKABLE') throw errors.bookingNotCancellable();
      throw err;
    }
  }

  /**
   * Consultation des réservations :
   * - passenger : uniquement les siennes
   * - admin : toutes
   * - agent : refusé (403)
   */
  async listBookings(user, query = {}) {
    if (!user || !user.role) {
      throw new AppError('UNAUTHORIZED', 401, 'Authentification requise.');
    }
    if (user.role === 'agent') {
      throw new AppError('FORBIDDEN', 403, 'Les agents ne peuvent pas consulter les réservations.');
    }
    if (user.role !== 'admin' && user.role !== 'passenger') {
      throw new AppError('FORBIDDEN', 403, 'Rôle non autorisé.');
    }

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));

    const filter = {};
    if (user.role === 'passenger') {
      filter.passengerId = user.id;
    } else if (query.passengerId) {
      filter.passengerId = query.passengerId;
    }
    if (query.departureId) filter.departureId = query.departureId;
    if (query.status) filter.status = query.status;

    const { data, total } = await this.bookingRepository.findPage(filter, { page, limit });

    return {
      items: data.map(toBookingView),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    };
  }

  /**
   * Affichage des sièges d'un départ : FREE ou OCCUPIED.
   */
  async getDepartureSeats(departureId) {
    const departure = await this.catalogueApi.getDeparture(departureId);
    const occupied = await this.bookingRepository.findOccupiedSeatNumbers(departureId);
    const occupiedSet = new Set(occupied.map(Number));

    const seats = (departure.seatPlan || []).map((number) => ({
      number,
      status: occupiedSet.has(Number(number)) ? 'OCCUPIED' : 'FREE',
    }));

    return {
      departureId: departure._id || departureId,
      status: departure.status,
      seats,
    };
  }
}

module.exports = { ReservationsService };
module.exports.ReservationsService = ReservationsService;
