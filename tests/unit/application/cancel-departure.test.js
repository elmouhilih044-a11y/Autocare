const { createCancelDepartureUseCase } = require('../../../src/application/cancel-departure');

describe('cancelDeparture use case (sans serveur ni vraie base)', () => {
  it('annule le départ et ses réservations confirmées dans une seule opération', async () => {
    const session = { id: 'fake-session' };
    const departure = { _id: 'dep-1', status: 'CANCELLED' };

    const catalogueApi = {
      cancel: jest.fn().mockResolvedValue(departure),
    };
    const reservationsApi = {
      cancelConfirmedByDeparture: jest.fn().mockResolvedValue(3),
    };
    const transactionRunner = jest.fn(async (work) => work(session));

    const cancelDeparture = createCancelDepartureUseCase({
      catalogueApi,
      reservationsApi,
      transactionRunner,
    });

    const result = await cancelDeparture('dep-1');

    expect(transactionRunner).toHaveBeenCalledTimes(1);
    expect(catalogueApi.cancel).toHaveBeenCalledWith('dep-1', { session });
    expect(reservationsApi.cancelConfirmedByDeparture).toHaveBeenCalledWith('dep-1', {
      session,
    });
    expect(result).toEqual({ departure, cancelledBookings: 3 });
  });

  it('ne touche pas aux réservations si l’annulation du départ échoue', async () => {
    const catalogueApi = {
      cancel: jest.fn().mockRejectedValue(Object.assign(new Error('fail'), { code: 'INVALID_DEPARTURE_TRANSITION' })),
    };
    const reservationsApi = {
      cancelConfirmedByDeparture: jest.fn(),
    };
    const transactionRunner = jest.fn(async (work) => work({}));

    const cancelDeparture = createCancelDepartureUseCase({
      catalogueApi,
      reservationsApi,
      transactionRunner,
    });

    await expect(cancelDeparture('dep-2')).rejects.toMatchObject({
      code: 'INVALID_DEPARTURE_TRANSITION',
    });
    expect(reservationsApi.cancelConfirmedByDeparture).not.toHaveBeenCalled();
  });

  it('propage l’échec de cascade des réservations (rollback transactionnel)', async () => {
    const catalogueApi = {
      cancel: jest.fn().mockResolvedValue({ status: 'CANCELLED' }),
    };
    const reservationsApi = {
      cancelConfirmedByDeparture: jest.fn().mockRejectedValue(new Error('cascade failed')),
    };
    const transactionRunner = jest.fn(async (work) => work({}));

    const cancelDeparture = createCancelDepartureUseCase({
      catalogueApi,
      reservationsApi,
      transactionRunner,
    });

    await expect(cancelDeparture('dep-3')).rejects.toThrow('cascade failed');
  });
});
