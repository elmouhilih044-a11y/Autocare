const { ReservationsService } = require('../../../src/modules/reservations/services/reservations.service');

describe('ReservationsService.listBookings (droits)', () => {
  const bookingRepository = {
    findPage: jest.fn(),
  };

  const service = new ReservationsService({
    bookingRepository,
    catalogueApi: {},
    ticketCodeGenerator: { generate: () => 'T' },
    clock: { now: () => new Date() },
    transactionRunner: (fn) => fn({}),
  });

  beforeEach(() => {
    bookingRepository.findPage.mockReset();
    bookingRepository.findPage.mockResolvedValue({
      data: [
        {
          _id: 'b1',
          departureId: 'd1',
          seatNumber: 1,
          passengerName: 'Sara',
          priceCents: 1000,
          status: 'CONFIRMED',
          ticketCode: 'AAA',
          cancelReason: null,
          boardedAt: null,
        },
      ],
      total: 1,
    });
  });

  it('un voyageur ne voit que ses propres réservations', async () => {
    const passenger = { id: '507f1f77bcf86cd799439011', role: 'passenger' };

    const result = await service.listBookings(passenger, { page: 1, limit: 10 });

    expect(bookingRepository.findPage).toHaveBeenCalledWith(
      { passengerId: passenger.id },
      { page: 1, limit: 10 }
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].ticketCode).toBe('AAA');
  });

  it('un voyageur ne peut pas forcer le filtre d’un autre passengerId', async () => {
    const passenger = { id: '507f1f77bcf86cd799439011', role: 'passenger' };

    await service.listBookings(passenger, {
      passengerId: '507f1f77bcf86cd799439099',
    });

    expect(bookingRepository.findPage).toHaveBeenCalledWith(
      { passengerId: passenger.id },
      expect.any(Object)
    );
  });

  it('l’admin voit toutes les réservations', async () => {
    const admin = { id: '507f1f77bcf86cd799439099', role: 'admin' };

    await service.listBookings(admin, {});

    expect(bookingRepository.findPage).toHaveBeenCalledWith({}, expect.any(Object));
  });

  it('l’agent est refusé', async () => {
    await expect(
      service.listBookings({ id: 'a1', role: 'agent' }, {})
    ).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 });
    expect(bookingRepository.findPage).not.toHaveBeenCalled();
  });
});
