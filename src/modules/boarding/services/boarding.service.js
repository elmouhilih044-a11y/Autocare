const { AppError } = require('../../../shared/errors');

class BoardingService {
  constructor({ boardingRecordRepository, reservationsApi, catalogueApi, clock, transactionRunner }) {
    this.boardingRecordRepository = boardingRecordRepository;
    this.reservationsApi = reservationsApi;
    this.catalogueApi = catalogueApi;
    this.clock = clock;
    this.transactionRunner = transactionRunner; // = withTransaction (a function)
  }

  // departureId from the URL, ticketCode from the body, agentId from the token
  async checkTicket({ departureId, ticketCode, agentId }) {
    return this.transactionRunner(async (session) => {
      const now = this.clock.now();

      // 1. Departure must be BOARDING (also touches revision: the shared guard)
      try {
        await this.catalogueApi.guardDeparture(departureId, {
          expectedStatus: 'BOARDING',
          session,
        });
      } catch (err) {
        if (err.code === 'DEPARTURE_NOT_BOOKABLE') {
          throw new AppError('BOARDING_CLOSED', 409, 'Embarquement non ouvert pour ce depart.');
        }
        throw err; // RESOURCE_NOT_FOUND (404) and others pass through
      }

      // 2. CONFIRMED -> BOARDED (throws 404 / 409 by itself)
      const booking = await this.reservationsApi.consumeTicket(
        { ticketCode, departureId, now },
        { session }
      );

      // 3. BoardingRecord in the same transaction
      try {
        return await this.boardingRecordRepository.create(
          { bookingId: booking._id, departureId, agentId, checkedAt: now },
          { session }
        );
      } catch (err) {
        if (err.code === 11000) {
          throw new AppError('TICKET_NOT_VALID', 409, 'Ce billet est deja utilise.');
        }
        throw err;
      }
    });
  }
}

module.exports = { BoardingService };