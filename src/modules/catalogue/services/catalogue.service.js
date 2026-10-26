const { AppError } = require('../../../shared/errors');

class CatalogueService {
  constructor({ catalogueRepository, clock }) {
    Object.assign(this, { catalogueRepository, clock });
  }

  // 1. جلب المدن والمحطات والخطوط والحافلات
  async getCities(filter = {}, options = {}) {
    return this.catalogueRepository.findCities(filter, options);
  }

  async getStops(filter = {}, options = {}) {
    return this.catalogueRepository.findStops(filter, options);
  }

  async getLines(filter = {}, options = {}) {
    return this.catalogueRepository.findLines(filter, options);
  }

  async getCoaches(filter = {}, options = {}) {
    return this.catalogueRepository.findCoaches(filter, options);
  }

  async getDepartures(filter = {}, options = {}) {
    return this.catalogueRepository.findDepartures(filter, options);
  }

  async getDepartureById(id, options = {}) {
    const departure = await this.catalogueRepository.findDepartureById(id, options);
    if (!departure) {
      throw new AppError('RESOURCE_NOT_FOUND', 404, 'Departure not found');
    }
    return departure;
  }

  // 2. إنشاء خط جديد (مع تطبيع الـ Code إلى أحرف كبيرة)
  async createLine(dto, options = {}) {
    dto.code = dto.code.trim().toUpperCase();
    return this.catalogueRepository.createLine(dto, options);
  }

  // 3. إنشاء حافلة جديدة
  async createCoach(dto, options = {}) {
    dto.registration = dto.registration.trim().toUpperCase();
    return this.catalogueRepository.createCoach(dto, options);
  }

  // 4. إنشاء رحلة مع الـ Snapshot الثابت (ADR-6)
  async createDeparture(dto, options = {}) {
    const line = await this.catalogueRepository.findLineById(dto.lineId);
    if (!line || line.isArchived) {
      throw new AppError('RESOURCE_CONFLICT', 409, 'Line is archived or not found');
    }

    const coach = await this.catalogueRepository.findCoachById(dto.coachId);
    if (!coach || coach.isArchived) {
      throw new AppError('RESOURCE_CONFLICT', 409, 'Coach is archived or not found');
    }

    // بناء الـ Snapshot والـ seatPlan من الحافلة
    const departureData = {
      lineId: line._id,
      coachId: coach._id,
      lineSnapshot: {
        code: line.code,
        label: line.label,
        stopIds: line.stopIds,
      },
      coachSnapshot: {
        registration: coach.registration,
      },
      seatPlan: coach.seatNumbers,
      departureAt: new Date(dto.departureAt),
      arrivalAt: new Date(dto.arrivalAt),
      fareCents: dto.fareCents,
      status: 'OPEN',
      revision: 0,
    };

    return this.catalogueRepository.createDeparture(departureData, options);
  }

  // 5. حراسة الرحلة والتحقق من حالتها لضمان التزامن (Guard Departure)
  async guardDeparture(id, expectedStatus, { session } = {}) {
    const departure = await this.catalogueRepository.guardDeparture(id, expectedStatus, session);
    if (!departure) {
      const exists = await this.catalogueRepository.departureExists(id, session);
      if (!exists) {
        throw new AppError('RESOURCE_NOT_FOUND', 404, 'Departure not found');
      }
      throw new AppError('DEPARTURE_NOT_BOOKABLE', 409, 'Departure status mismatch or not bookable');
    }
    return departure;
  }

  // 6. انتقالات الحالة للرحلة (start-boarding, depart, cancel)
  async updateStatus(id, newStatus, { session } = {}) {
    let expectedStatus = 'OPEN';
    if (newStatus === 'BOARDING') expectedStatus = 'OPEN';
    if (newStatus === 'DEPARTED') expectedStatus = 'BOARDING';
    if (newStatus === 'CANCELLED') expectedStatus = 'OPEN';

    const departure = await this.catalogueRepository.guardDeparture(id, expectedStatus, session);
    if (!departure) {
      throw new AppError('INVALID_DEPARTURE_TRANSITION', 409, 'Invalid status transition for departure');
    }

    departure.status = newStatus;
    await departure.save({ session });
    return departure;
  }
}

module.exports = { CatalogueService };