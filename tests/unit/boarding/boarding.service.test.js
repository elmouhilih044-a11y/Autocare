const { BoardingService } = require('../../../src/modules/boarding/services/boarding.service');
const { AppError } = require('../../../src/shared/errors');

const DEPARTURE_ID = '507f1f77bcf86cd799439030';
const BOOKING_ID = '507f1f77bcf86cd799439031';
const AGENT_ID = '507f1f77bcf86cd799439011';
const FIXED_NOW = new Date('2027-03-15T08:50:00.000Z');

function buildService(overrides = {}) {
  const deps = {
    boardingRecordRepository: {
      create: jest.fn(async (data) => ({ _id: 'rec1', ...data })),
    },
    reservationsApi: {
      consumeTicket: jest.fn(async () => ({ _id: BOOKING_ID })),
    },
    catalogueApi: {
      guardDeparture: jest.fn(async () => ({ _id: DEPARTURE_ID })),
    },
    clock: { now: () => FIXED_NOW },
    // fake runner: no DB, just runs the work with a fake session
    transactionRunner: jest.fn((work) => work({ fake: 'session' })),
    ...overrides,
  };
  return { service: new BoardingService(deps), deps };
}

const input = { departureId: DEPARTURE_ID, ticketCode: 'abc', agentId: AGENT_ID };

describe('BoardingService.checkTicket', () => {
  test('valid scan creates the record with agentId and checkedAt from the clock', async () => {
    const { service, deps } = buildService();

    const record = await service.checkTicket(input);

    expect(deps.catalogueApi.guardDeparture).toHaveBeenCalledWith(DEPARTURE_ID, {
      expectedStatus: 'BOARDING',
      session: { fake: 'session' },
    });
    expect(deps.reservationsApi.consumeTicket).toHaveBeenCalledWith(
      { ticketCode: 'abc', departureId: DEPARTURE_ID, now: FIXED_NOW },
      { session: { fake: 'session' } }
    );
    expect(deps.boardingRecordRepository.create).toHaveBeenCalledWith(
      { bookingId: BOOKING_ID, departureId: DEPARTURE_ID, agentId: AGENT_ID, checkedAt: FIXED_NOW },
      { session: { fake: 'session' } }
    );
    expect(record.checkedAt).toBe(FIXED_NOW);
  });

  test('departure not BOARDING gives BOARDING_CLOSED and creates nothing', async () => {
    const { service, deps } = buildService({
      catalogueApi: {
        guardDeparture: jest.fn(async () => {
          throw new AppError('DEPARTURE_NOT_BOOKABLE', 409, 'status mismatch');
        }),
      },
    });

    await expect(service.checkTicket(input)).rejects.toMatchObject({
      code: 'BOARDING_CLOSED',
      statusCode: 409,
    });
    expect(deps.reservationsApi.consumeTicket).not.toHaveBeenCalled();
    expect(deps.boardingRecordRepository.create).not.toHaveBeenCalled();
  });

  test('unknown departure keeps its 404', async () => {
    const { service } = buildService({
      catalogueApi: {
        guardDeparture: jest.fn(async () => {
          throw new AppError('RESOURCE_NOT_FOUND', 404, 'Departure not found');
        }),
      },
    });

    await expect(service.checkTicket(input)).rejects.toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
      statusCode: 404,
    });
  });

  test('unknown ticket passes its error through and creates nothing', async () => {
    const { service, deps } = buildService({
      reservationsApi: {
        consumeTicket: jest.fn(async () => {
          throw new AppError('TICKET_NOT_FOUND', 404, 'Billet inconnu.');
        }),
      },
    });

    await expect(service.checkTicket(input)).rejects.toMatchObject({
      code: 'TICKET_NOT_FOUND',
      statusCode: 404,
    });
    expect(deps.boardingRecordRepository.create).not.toHaveBeenCalled();
  });

  test('duplicate key on record creation gives TICKET_NOT_VALID (409)', async () => {
    const dup = Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
    const { service } = buildService({
      boardingRecordRepository: { create: jest.fn(async () => { throw dup; }) },
    });

    await expect(service.checkTicket(input)).rejects.toMatchObject({
      code: 'TICKET_NOT_VALID',
      statusCode: 409,
    });
  });

  test('any other record error is not hidden', async () => {
    const boom = new Error('disk failure');
    const { service } = buildService({
      boardingRecordRepository: { create: jest.fn(async () => { throw boom; }) },
    });

    await expect(service.checkTicket(input)).rejects.toBe(boom);
  });
});