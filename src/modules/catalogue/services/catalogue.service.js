const { AppError } = require('../../../shared/errors');

class CatalogueService {
  constructor(cradle = {}) {
    this.catalogueRepository = cradle.catalogueRepository;
    this.clock = cradle.clock || { now: () => new Date() };
  }

  // Helper for pagination
  _parsePagination(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
  }

  // ---------------------------------------------------------------------------
  // 1. Cities
  // ---------------------------------------------------------------------------
  async getCities(query = {}, options = {}) {
    const { page, limit, skip } = this._parsePagination(query);
    const filter = {};
    if (query.name) {
      filter.name = { $regex: query.name, $options: 'i' };
    }

    const [items, total] = await Promise.all([
      this.catalogueRepository.findCities(filter, { ...options, skip, limit }),
      this.catalogueRepository.countCities(filter, options),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCityById(id, options = {}) {
    const city = await this.catalogueRepository.findCityById(id, options);
    if (!city) {
      throw new AppError('RESOURCE_NOT_FOUND', 404, 'City not found');
    }
    return city;
  }

  // ---------------------------------------------------------------------------
  // 2. Stops
  // ---------------------------------------------------------------------------
  async getStops(query = {}, options = {}) {
    const { page, limit, skip } = this._parsePagination(query);
    const filter = {};
    if (query.cityId) {
      filter.cityId = query.cityId;
    }
    if (query.name) {
      filter.name = { $regex: query.name, $options: 'i' };
    }

    const [items, total] = await Promise.all([
      this.catalogueRepository.findStops(filter, { ...options, skip, limit }),
      this.catalogueRepository.countStops(filter, options),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStopById(id, options = {}) {
    const stop = await this.catalogueRepository.findStopById(id, options);
    if (!stop) {
      throw new AppError('RESOURCE_NOT_FOUND', 404, 'Stop not found');
    }
    return stop;
  }

  // ---------------------------------------------------------------------------
  // 3. Lines
  // ---------------------------------------------------------------------------
  async getLines(query = {}, options = {}) {
    const { page, limit, skip } = this._parsePagination(query);
    const filter = {};
    if (query.isArchived !== undefined) {
      filter.isArchived = query.isArchived === 'true' || query.isArchived === true;
    }

    const [items, total] = await Promise.all([
      this.catalogueRepository.findLines(filter, { ...options, skip, limit }),
      this.catalogueRepository.countLines(filter, options),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLineById(id, options = {}) {
    const line = await this.catalogueRepository.findLineById(id, options);
    if (!line) {
      throw new AppError('RESOURCE_NOT_FOUND', 404, 'Line not found');
    }
    return line;
  }

  async createLine(dto, options = {}) {
    if (!dto || !dto.code) {
      throw new AppError('INVALID_INPUT', 400, 'Line code is required');
    }
    if (!dto.label) {
      throw new AppError('INVALID_INPUT', 400, 'Line label is required');
    }

    // Normalization: trim and uppercase
    const code = dto.code.trim().toUpperCase();

    // Check duplicate code
    const existing = await this.catalogueRepository.findLineByCode(code, options);
    if (existing) {
      throw new AppError('DUPLICATE_CODE', 409, 'Line code already exists');
    }

    const stopIds = dto.stopIds || [];
    if (Array.isArray(stopIds) && stopIds.length > 0) {
      const uniqueStops = new Set(stopIds.map(String));
      if (uniqueStops.size !== stopIds.length) {
        throw new AppError('INVALID_INPUT', 400, 'stopIds must not contain duplicate stops');
      }
    }

    const lineData = {
      code,
      label: dto.label.trim(),
      stopIds,
      isArchived: false,
    };

    try {
      return await this.catalogueRepository.createLine(lineData, options);
    } catch (err) {
      if (err.code === 11000) {
        throw new AppError('DUPLICATE_CODE', 409, 'Line code already exists');
      }
      throw err;
    }
  }

  async updateLine(id, dto, options = {}) {
    if (!dto || Object.keys(dto).length === 0) {
      throw new AppError('EMPTY_PATCH', 400, 'PATCH body cannot be empty');
    }

    const line = await this.catalogueRepository.findLineById(id, options);
    if (!line) {
      throw new AppError('RESOURCE_NOT_FOUND', 404, 'Line not found');
    }
    if (line.isArchived) {
      throw new AppError('CANNOT_MODIFY_ARCHIVED', 400, 'Cannot modify an archived line');
    }

    const updateData = {};
    if (dto.code) {
      updateData.code = dto.code.trim().toUpperCase();
      const existing = await this.catalogueRepository.findLineByCode(updateData.code, options);
      if (existing && existing._id.toString() !== id.toString()) {
        throw new AppError('DUPLICATE_CODE', 409, 'Line code already exists');
      }
    }
    if (dto.label !== undefined) updateData.label = dto.label.trim();
    if (dto.stopIds !== undefined) {
      if (Array.isArray(dto.stopIds)) {
        const uniqueStops = new Set(dto.stopIds.map(String));
        if (uniqueStops.size !== dto.stopIds.length) {
          throw new AppError('INVALID_INPUT', 400, 'stopIds must not contain duplicate stops');
        }
      }
      updateData.stopIds = dto.stopIds;
    }

    return this.catalogueRepository.updateLine(id, updateData, options);
  }

  // Soft delete line: sets isArchived = true (204 No Content)
  async archiveLine(id, options = {}) {
    const line = await this.catalogueRepository.findLineById(id, options);
    if (!line) {
      throw new AppError('RESOURCE_NOT_FOUND', 404, 'Line not found');
    }
    await this.catalogueRepository.archiveLine(id, options);
  }

  // ---------------------------------------------------------------------------
  // 4. Coaches
  // ---------------------------------------------------------------------------
  async getCoaches(query = {}, options = {}) {
    const { page, limit, skip } = this._parsePagination(query);
    const filter = {};
    if (query.isArchived !== undefined) {
      filter.isArchived = query.isArchived === 'true' || query.isArchived === true;
    }

    const [items, total] = await Promise.all([
      this.catalogueRepository.findCoaches(filter, { ...options, skip, limit }),
      this.catalogueRepository.countCoaches(filter, options),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCoachById(id, options = {}) {
    const coach = await this.catalogueRepository.findCoachById(id, options);
    if (!coach) {
      throw new AppError('RESOURCE_NOT_FOUND', 404, 'Coach not found');
    }
    return coach;
  }

  async createCoach(dto, options = {}) {
    if (!dto || !dto.registration) {
      throw new AppError('INVALID_INPUT', 400, 'Coach registration is required');
    }
    if (!Array.isArray(dto.seatNumbers) || dto.seatNumbers.length === 0) {
      throw new AppError('INVALID_INPUT', 400, 'Coach seatNumbers must be a non-empty array');
    }

    // Normalization: trim and uppercase
    const registration = dto.registration.trim().toUpperCase();

    // Check duplicate registration
    const existing = await this.catalogueRepository.findCoachByRegistration(registration, options);
    if (existing) {
      throw new AppError('DUPLICATE_REGISTRATION', 409, 'Coach registration already exists');
    }

    // Check unique seat numbers > 0
    const uniqueSeats = new Set(dto.seatNumbers);
    if (uniqueSeats.size !== dto.seatNumbers.length || dto.seatNumbers.some((n) => typeof n !== 'number' || n <= 0)) {
      throw new AppError('INVALID_INPUT', 400, 'seatNumbers must be unique positive integers');
    }

    const coachData = {
      registration,
      seatNumbers: dto.seatNumbers,
      isArchived: false,
    };

    try {
      return await this.catalogueRepository.createCoach(coachData, options);
    } catch (err) {
      if (err.code === 11000) {
        throw new AppError('DUPLICATE_REGISTRATION', 409, 'Coach registration already exists');
      }
      throw err;
    }
  }

  async updateCoach(id, dto, options = {}) {
    if (!dto || Object.keys(dto).length === 0) {
      throw new AppError('EMPTY_PATCH', 400, 'PATCH body cannot be empty');
    }

    const coach = await this.catalogueRepository.findCoachById(id, options);
    if (!coach) {
      throw new AppError('RESOURCE_NOT_FOUND', 404, 'Coach not found');
    }
    if (coach.isArchived) {
      throw new AppError('CANNOT_MODIFY_ARCHIVED', 400, 'Cannot modify an archived coach');
    }

    const updateData = {};
    if (dto.registration) {
      updateData.registration = dto.registration.trim().toUpperCase();
      const existing = await this.catalogueRepository.findCoachByRegistration(updateData.registration, options);
      if (existing && existing._id.toString() !== id.toString()) {
        throw new AppError('DUPLICATE_REGISTRATION', 409, 'Coach registration already exists');
      }
    }
    if (dto.seatNumbers !== undefined) {
      if (Array.isArray(dto.seatNumbers)) {
        const uniqueSeats = new Set(dto.seatNumbers);
        if (uniqueSeats.size !== dto.seatNumbers.length || dto.seatNumbers.some((n) => typeof n !== 'number' || n <= 0)) {
          throw new AppError('INVALID_INPUT', 400, 'seatNumbers must be unique positive integers');
        }
      }
      updateData.seatNumbers = dto.seatNumbers;
    }

    return this.catalogueRepository.updateCoach(id, updateData, options);
  }

  // Soft delete coach: sets isArchived = true (204 No Content)
  async archiveCoach(id, options = {}) {
    const coach = await this.catalogueRepository.findCoachById(id, options);
    if (!coach) {
      throw new AppError('RESOURCE_NOT_FOUND', 404, 'Coach not found');
    }
    await this.catalogueRepository.archiveCoach(id, options);
  }

  // ---------------------------------------------------------------------------
  // 5. Departures
  // ---------------------------------------------------------------------------
  async getDepartures(query = {}, options = {}) {
    const { page, limit, skip } = this._parsePagination(query);
    const filter = {};
    if (query.lineId) filter.lineId = query.lineId;
    if (query.status) filter.status = query.status;
    if (query.from) {
      filter.departureAt = { ...filter.departureAt, $gte: new Date(query.from) };
    }
    if (query.to) {
      filter.departureAt = { ...filter.departureAt, $lte: new Date(query.to) };
    }

    const [items, total] = await Promise.all([
      this.catalogueRepository.findDepartures(filter, { ...options, skip, limit }),
      this.catalogueRepository.countDepartures(filter, options),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDepartureById(id, options = {}) {
    const departure = await this.catalogueRepository.findDepartureById(id, options);
    if (!departure) {
      throw new AppError('RESOURCE_NOT_FOUND', 404, 'Departure not found');
    }
    return departure;
  }

  // Departure creation with frozen snapshots (Task 4, ST-15, ADR-6)
  async createDeparture(dto, options = {}) {
    if (!dto.lineId || !dto.coachId || !dto.departureAt || !dto.arrivalAt || dto.fareCents === undefined) {
      throw new AppError('INVALID_INPUT', 400, 'Missing required fields for departure');
    }

    const depDate = new Date(dto.departureAt);
    const arrDate = new Date(dto.arrivalAt);

    if (isNaN(depDate.getTime()) || isNaN(arrDate.getTime())) {
      throw new AppError('INVALID_INPUT', 400, 'Invalid date format');
    }

    const now = this.clock.now ? this.clock.now() : new Date();
    if (depDate <= now) {
      throw new AppError('INVALID_INPUT', 400, 'departureAt must be a future date');
    }

    if (arrDate <= depDate) {
      throw new AppError('INVALID_INPUT', 400, 'arrivalAt must be after departureAt');
    }

    const fare = Number(dto.fareCents);
    if (!Number.isInteger(fare) || fare < 0) {
      throw new AppError('INVALID_INPUT', 400, 'fareCents must be a non-negative integer');
    }

    const line = await this.catalogueRepository.findLineById(dto.lineId, options);
    if (!line) {
      throw new AppError('RESOURCE_NOT_FOUND', 404, 'Line not found');
    }
    if (line.isArchived) {
      throw new AppError('LINE_ARCHIVED', 409, 'Cannot assign archived line to new departures');
    }

    const coach = await this.catalogueRepository.findCoachById(dto.coachId, options);
    if (!coach) {
      throw new AppError('RESOURCE_NOT_FOUND', 404, 'Coach not found');
    }
    if (coach.isArchived) {
      throw new AppError('COACH_ARCHIVED', 409, 'Cannot assign archived coach to new departures');
    }

    // Freeze snapshots
    const stopIds = (line.stopIds || []).map((s) => (s._id ? s._id : s));
    const departureData = {
      lineId: line._id,
      coachId: coach._id,
      lineSnapshot: {
        code: line.code,
        label: line.label,
        stops: line.stopIds || [],
        stopIds,
      },
      coachSnapshot: {
        registration: coach.registration,
        seatPlan: [...coach.seatNumbers],
      },
      seatPlan: [...coach.seatNumbers],
      departureAt: depDate,
      arrivalAt: arrDate,
      fareCents: fare,
      status: 'OPEN',
      revision: 0,
    };

    return this.catalogueRepository.createDeparture(departureData, options);
  }

  // Optimistic concurrency guard via Departure.revision (Task 5, ADR-3)
  async guardDeparture(id, arg2, arg3) {
    let expectedStatus = 'OPEN';
    let session = undefined;

    if (typeof arg2 === 'string') {
      expectedStatus = arg2;
      if (arg3 && typeof arg3 === 'object') {
        session = arg3.session;
      }
    } else if (arg2 && typeof arg2 === 'object') {
      if (arg2.expectedStatus) expectedStatus = arg2.expectedStatus;
      if (arg2.session) session = arg2.session;
    }

    const dep = await this.catalogueRepository.guardDeparture(id, expectedStatus, session);
    if (!dep) {
      const exists = await this.catalogueRepository.departureExists(id, session);
      if (!exists) {
        throw new AppError('RESOURCE_NOT_FOUND', 404, 'Departure not found');
      }
      throw new AppError('DEPARTURE_NOT_BOOKABLE', 409, 'Departure is not bookable or status mismatch');
    }

    return dep;
  }

  // State transitions: OPEN -> BOARDING -> DEPARTED or CANCELLED (Section 3.6)
  async updateStatus(id, newStatus, options = {}) {
    const session = options.session;
    let expectedStatus;

    if (newStatus === 'BOARDING') {
      expectedStatus = 'OPEN';
    } else if (newStatus === 'DEPARTED') {
      expectedStatus = 'BOARDING';
    } else if (newStatus === 'CANCELLED') {
      expectedStatus = 'OPEN';
    } else {
      throw new AppError('INVALID_STATUS', 400, `Unknown status: ${newStatus}`);
    }

    const departure = await this.catalogueRepository.updateDepartureStatus(
      id,
      expectedStatus,
      newStatus,
      session
    );

    if (!departure) {
      const exists = await this.catalogueRepository.departureExists(id, session);
      if (!exists) {
        throw new AppError('RESOURCE_NOT_FOUND', 404, 'Departure not found');
      }
      throw new AppError(
        'INVALID_DEPARTURE_TRANSITION',
        409,
        `Cannot transition departure to ${newStatus} from its current status`
      );
    }

    return departure;
  }
}

module.exports = CatalogueService;
module.exports.CatalogueService = CatalogueService;
