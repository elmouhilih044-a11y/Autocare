const CatalogueService = require('../../../src/modules/catalogue/services/catalogue.service');
const { AppError } = require('../../../src/shared/errors');

describe('CatalogueService (Unit Tests)', () => {
  let catalogueService;
  let mockRepo;
  let mockClock;

  beforeEach(() => {
    mockClock = {
      now: jest.fn(() => new Date('2026-06-01T00:00:00.000Z')),
    };

    mockRepo = {
      findCities: jest.fn(),
      countCities: jest.fn(),
      findCityById: jest.fn(),
      findStops: jest.fn(),
      countStops: jest.fn(),
      findStopById: jest.fn(),
      findLines: jest.fn(),
      countLines: jest.fn(),
      findLineById: jest.fn(),
      findLineByCode: jest.fn(),
      createLine: jest.fn(),
      updateLine: jest.fn(),
      archiveLine: jest.fn(),
      findCoaches: jest.fn(),
      countCoaches: jest.fn(),
      findCoachById: jest.fn(),
      findCoachByRegistration: jest.fn(),
      createCoach: jest.fn(),
      updateCoach: jest.fn(),
      archiveCoach: jest.fn(),
      findDepartures: jest.fn(),
      countDepartures: jest.fn(),
      findDepartureById: jest.fn(),
      createDeparture: jest.fn(),
      guardDeparture: jest.fn(),
      departureExists: jest.fn(),
      updateDepartureStatus: jest.fn(),
    };

    catalogueService = new CatalogueService({
      catalogueRepository: mockRepo,
      clock: mockClock,
    });
  });

  // ---------------------------------------------------------------------------
  // 1. Cities & Stops
  // ---------------------------------------------------------------------------
  describe('Cities & Stops', () => {
    it('getCities should query repository with pagination and return metadata', async () => {
      const mockCities = [{ _id: 'c1', name: 'Casablanca' }];
      mockRepo.findCities.mockResolvedValue(mockCities);
      mockRepo.countCities.mockResolvedValue(1);

      const result = await catalogueService.getCities({ page: 1, limit: 10 });

      expect(mockRepo.findCities).toHaveBeenCalledWith({}, expect.objectContaining({ skip: 0, limit: 10 }));
      expect(result.items).toEqual(mockCities);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });

    it('getCityById should throw 404 when city is not found', async () => {
      mockRepo.findCityById.mockResolvedValue(null);

      await expect(catalogueService.getCityById('non-existent')).rejects.toThrow(AppError);
      await expect(catalogueService.getCityById('non-existent')).rejects.toMatchObject({
        statusCode: 404,
        code: 'RESOURCE_NOT_FOUND',
      });
    });

    it('getStops should filter by cityId if provided', async () => {
      const mockStops = [{ _id: 's1', name: 'Gare', cityId: 'c1' }];
      mockRepo.findStops.mockResolvedValue(mockStops);
      mockRepo.countStops.mockResolvedValue(1);

      const result = await catalogueService.getStops({ cityId: 'c1', page: 1, limit: 5 });

      expect(mockRepo.findStops).toHaveBeenCalledWith(
        { cityId: 'c1' },
        expect.objectContaining({ skip: 0, limit: 5 })
      );
      expect(result.items).toEqual(mockStops);
    });

    it('getStopById should throw 404 when stop is not found', async () => {
      mockRepo.findStopById.mockResolvedValue(null);

      await expect(catalogueService.getStopById('invalid-stop')).rejects.toMatchObject({
        statusCode: 404,
        code: 'RESOURCE_NOT_FOUND',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Lines & Data Normalization
  // ---------------------------------------------------------------------------
  describe('Lines & Normalization', () => {
    it('createLine should trim and convert code to UPPERCASE', async () => {
      mockRepo.findLineByCode.mockResolvedValue(null);
      mockRepo.createLine.mockImplementation(async (data) => ({ _id: 'line1', ...data }));

      const result = await catalogueService.createLine({
        code: '  line-cas-rab  ',
        label: 'Casablanca - Rabat',
        stopIds: ['stop1', 'stop2'],
      });

      expect(mockRepo.findLineByCode).toHaveBeenCalledWith('LINE-CAS-RAB', {});
      expect(mockRepo.createLine).toHaveBeenCalledWith(
        {
          code: 'LINE-CAS-RAB',
          label: 'Casablanca - Rabat',
          stopIds: ['stop1', 'stop2'],
          isArchived: false,
        },
        {}
      );
      expect(result.code).toBe('LINE-CAS-RAB');
    });

    it('createLine should throw 400 if code or label is missing', async () => {
      await expect(catalogueService.createLine({ code: '', label: 'Route' })).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_INPUT',
      });
      await expect(catalogueService.createLine({ code: 'LINE-1', label: '' })).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_INPUT',
      });
    });

    it('createLine should throw 409 if line code already exists', async () => {
      mockRepo.findLineByCode.mockResolvedValue({ _id: 'line1', code: 'LINE-EXISTS' });

      await expect(
        catalogueService.createLine({ code: 'line-exists', label: 'Duplicate Route' })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'DUPLICATE_CODE',
      });
    });

    it('createLine should catch MongoDB E11000 duplicate key error and throw 409', async () => {
      mockRepo.findLineByCode.mockResolvedValue(null);
      const duplicateError = new Error('E11000 duplicate key');
      duplicateError.code = 11000;
      mockRepo.createLine.mockRejectedValue(duplicateError);

      await expect(
        catalogueService.createLine({ code: 'LINE-RACE', label: 'Race condition' })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'DUPLICATE_CODE',
      });
    });

    it('archiveLine should soft-delete by setting isArchived: true', async () => {
      mockRepo.findLineById.mockResolvedValue({ _id: 'line1', isArchived: false });
      mockRepo.archiveLine.mockResolvedValue({ _id: 'line1', isArchived: true });

      await catalogueService.archiveLine('line1');

      expect(mockRepo.findLineById).toHaveBeenCalledWith('line1', {});
      expect(mockRepo.archiveLine).toHaveBeenCalledWith('line1', {});
    });

    it('archiveLine should throw 404 when line does not exist', async () => {
      mockRepo.findLineById.mockResolvedValue(null);

      await expect(catalogueService.archiveLine('unknown-line')).rejects.toMatchObject({
        statusCode: 404,
        code: 'RESOURCE_NOT_FOUND',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Coaches & Data Normalization
  // ---------------------------------------------------------------------------
  describe('Coaches & Normalization', () => {
    it('createCoach should trim and convert registration to UPPERCASE', async () => {
      mockRepo.findCoachByRegistration.mockResolvedValue(null);
      mockRepo.createCoach.mockImplementation(async (data) => ({ _id: 'coach1', ...data }));

      const result = await catalogueService.createCoach({
        registration: '  12345-a-6  ',
        seatNumbers: [1, 2, 3, 4],
      });

      expect(mockRepo.findCoachByRegistration).toHaveBeenCalledWith('12345-A-6', {});
      expect(mockRepo.createCoach).toHaveBeenCalledWith(
        {
          registration: '12345-A-6',
          seatNumbers: [1, 2, 3, 4],
          isArchived: false,
        },
        {}
      );
      expect(result.registration).toBe('12345-A-6');
    });

    it('createCoach should throw 400 if registration or seatNumbers is invalid', async () => {
      await expect(
        catalogueService.createCoach({ registration: '', seatNumbers: [1, 2] })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_INPUT',
      });

      await expect(
        catalogueService.createCoach({ registration: '123-B', seatNumbers: [] })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_INPUT',
      });
    });

    it('createCoach should throw 409 if registration already exists', async () => {
      mockRepo.findCoachByRegistration.mockResolvedValue({ _id: 'c1', registration: 'REG-DUP' });

      await expect(
        catalogueService.createCoach({ registration: 'reg-dup', seatNumbers: [1, 2] })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'DUPLICATE_REGISTRATION',
      });
    });

    it('archiveCoach should soft-delete by setting isArchived: true', async () => {
      mockRepo.findCoachById.mockResolvedValue({ _id: 'coach1', isArchived: false });
      mockRepo.archiveCoach.mockResolvedValue({ _id: 'coach1', isArchived: true });

      await catalogueService.archiveCoach('coach1');

      expect(mockRepo.findCoachById).toHaveBeenCalledWith('coach1', {});
      expect(mockRepo.archiveCoach).toHaveBeenCalledWith('coach1', {});
    });

    it('archiveCoach should throw 404 when coach is not found', async () => {
      mockRepo.findCoachById.mockResolvedValue(null);

      await expect(catalogueService.archiveCoach('unknown-coach')).rejects.toMatchObject({
        statusCode: 404,
        code: 'RESOURCE_NOT_FOUND',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Departure Creation & Snapshot Handling
  // ---------------------------------------------------------------------------
  describe('Departure Creation & Snapshots', () => {
    const validDepartureDto = {
      lineId: 'line1',
      coachId: 'coach1',
      departureAt: '2026-06-01T08:00:00.000Z',
      arrivalAt: '2026-06-01T10:00:00.000Z',
      fareCents: 15000,
    };

    it('should freeze snapshots of line and coach upon departure creation', async () => {
      mockRepo.findLineById.mockResolvedValue({
        _id: 'line1',
        code: 'LINE-100',
        label: 'Casablanca - Marrakech',
        stopIds: [{ _id: 's1', name: 'Casa' }, { _id: 's2', name: 'Marrakech' }],
        isArchived: false,
      });

      mockRepo.findCoachById.mockResolvedValue({
        _id: 'coach1',
        registration: '99999-B-1',
        seatNumbers: [1, 2, 3, 4, 5],
        isArchived: false,
      });

      mockRepo.createDeparture.mockImplementation(async (data) => ({ _id: 'dep1', ...data }));

      const departure = await catalogueService.createDeparture(validDepartureDto);

      expect(mockRepo.createDeparture).toHaveBeenCalledWith(
        expect.objectContaining({
          lineId: 'line1',
          coachId: 'coach1',
          status: 'OPEN',
          revision: 0,
          fareCents: 15000,
          lineSnapshot: {
            code: 'LINE-100',
            label: 'Casablanca - Marrakech',
            stops: [{ _id: 's1', name: 'Casa' }, { _id: 's2', name: 'Marrakech' }],
            stopIds: ['s1', 's2'],
          },
          coachSnapshot: {
            registration: '99999-B-1',
            seatPlan: [1, 2, 3, 4, 5],
          },
          seatPlan: [1, 2, 3, 4, 5],
        }),
        {}
      );

      expect(departure.status).toBe('OPEN');
      expect(departure.revision).toBe(0);
    });

    it('should throw 409 LINE_ARCHIVED if assigned line is archived', async () => {
      mockRepo.findLineById.mockResolvedValue({
        _id: 'line1',
        code: 'LINE-ARCHIVED',
        isArchived: true,
      });

      await expect(catalogueService.createDeparture(validDepartureDto)).rejects.toMatchObject({
        statusCode: 409,
        code: 'LINE_ARCHIVED',
      });
    });

    it('should throw 409 COACH_ARCHIVED if assigned coach is archived', async () => {
      mockRepo.findLineById.mockResolvedValue({
        _id: 'line1',
        code: 'LINE-ACTIVE',
        isArchived: false,
      });

      mockRepo.findCoachById.mockResolvedValue({
        _id: 'coach1',
        registration: 'COACH-ARCHIVED',
        isArchived: true,
      });

      await expect(catalogueService.createDeparture(validDepartureDto)).rejects.toMatchObject({
        statusCode: 409,
        code: 'COACH_ARCHIVED',
      });
    });

    it('should throw 404 if assigned line or coach does not exist', async () => {
      mockRepo.findLineById.mockResolvedValue(null);
      await expect(catalogueService.createDeparture(validDepartureDto)).rejects.toMatchObject({
        statusCode: 404,
        code: 'RESOURCE_NOT_FOUND',
      });

      mockRepo.findLineById.mockResolvedValue({ _id: 'line1', isArchived: false });
      mockRepo.findCoachById.mockResolvedValue(null);
      await expect(catalogueService.createDeparture(validDepartureDto)).rejects.toMatchObject({
        statusCode: 404,
        code: 'RESOURCE_NOT_FOUND',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Concurrency Guard & Status Transitions
  // ---------------------------------------------------------------------------
  describe('Concurrency Guard (guardDeparture) & Transitions', () => {
    it('guardDeparture should increment revision and return updated departure', async () => {
      const mockGuardedDep = {
        _id: 'dep1',
        status: 'OPEN',
        revision: 1,
      };
      mockRepo.guardDeparture.mockResolvedValue(mockGuardedDep);

      const session = { id: 'mock-session' };
      const result = await catalogueService.guardDeparture('dep1', 'OPEN', { session });

      expect(mockRepo.guardDeparture).toHaveBeenCalledWith('dep1', 'OPEN', session);
      expect(result.revision).toBe(1);
    });

    it('guardDeparture should support options object signature: guardDeparture(id, { expectedStatus, session })', async () => {
      const mockGuardedDep = { _id: 'dep1', status: 'OPEN', revision: 2 };
      mockRepo.guardDeparture.mockResolvedValue(mockGuardedDep);

      const session = { id: 'sess-obj' };
      const result = await catalogueService.guardDeparture('dep1', { expectedStatus: 'OPEN', session });

      expect(mockRepo.guardDeparture).toHaveBeenCalledWith('dep1', 'OPEN', session);
      expect(result.revision).toBe(2);
    });

    it('guardDeparture should throw 404 when departure does not exist', async () => {
      mockRepo.guardDeparture.mockResolvedValue(null);
      mockRepo.departureExists.mockResolvedValue(false);

      await expect(catalogueService.guardDeparture('missing-dep', 'OPEN')).rejects.toMatchObject({
        statusCode: 404,
        code: 'RESOURCE_NOT_FOUND',
      });
    });

    it('guardDeparture should throw 409 DEPARTURE_NOT_BOOKABLE when departure exists but status mismatched', async () => {
      mockRepo.guardDeparture.mockResolvedValue(null);
      mockRepo.departureExists.mockResolvedValue(true);

      await expect(catalogueService.guardDeparture('dep1', 'OPEN')).rejects.toMatchObject({
        statusCode: 409,
        code: 'DEPARTURE_NOT_BOOKABLE',
      });
    });

    it('updateStatus should transition from OPEN to BOARDING successfully', async () => {
      mockRepo.updateDepartureStatus.mockResolvedValue({
        _id: 'dep1',
        status: 'BOARDING',
        revision: 1,
      });

      const result = await catalogueService.updateStatus('dep1', 'BOARDING');

      expect(mockRepo.updateDepartureStatus).toHaveBeenCalledWith('dep1', 'OPEN', 'BOARDING', undefined);
      expect(result.status).toBe('BOARDING');
    });

    it('updateStatus should transition from BOARDING to DEPARTED successfully', async () => {
      mockRepo.updateDepartureStatus.mockResolvedValue({
        _id: 'dep1',
        status: 'DEPARTED',
        revision: 2,
      });

      const result = await catalogueService.updateStatus('dep1', 'DEPARTED');

      expect(mockRepo.updateDepartureStatus).toHaveBeenCalledWith('dep1', 'BOARDING', 'DEPARTED', undefined);
      expect(result.status).toBe('DEPARTED');
    });

    it('updateStatus should throw 409 INVALID_DEPARTURE_TRANSITION when transition is illegal', async () => {
      mockRepo.updateDepartureStatus.mockResolvedValue(null);
      mockRepo.departureExists.mockResolvedValue(true);

      await expect(catalogueService.updateStatus('dep1', 'DEPARTED')).rejects.toMatchObject({
        statusCode: 409,
        code: 'INVALID_DEPARTURE_TRANSITION',
      });
    });

    it('updateStatus should throw 400 when status is unknown', async () => {
      await expect(catalogueService.updateStatus('dep1', 'FLYING')).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_STATUS',
      });
    });
  });
});
