const City = require('../models/city.model');
const Stop = require('../models/stop.model');
const Line = require('../models/line.model');
const Coach = require('../models/coach.model');
const Departure = require('../models/departure.model');

class CatalogueRepository {
  // --- Cities ---
  async findCities(filter = {}, options = {}) {
    return City.find(filter, null, options);
  }

  async countCities(filter = {}, options = {}) {
    const session = options.session;
    return City.countDocuments(filter).session(session);
  }

  async findCityById(id, { session } = {}) {
    return City.findById(id).session(session);
  }

  // --- Stops ---
  async findStops(filter = {}, options = {}) {
    return Stop.find(filter, null, options).populate('cityId');
  }

  async countStops(filter = {}, options = {}) {
    const session = options.session;
    return Stop.countDocuments(filter).session(session);
  }

  async findStopById(id, { session } = {}) {
    return Stop.findById(id).session(session);
  }

  // --- Lines ---
  async findLines(filter = {}, options = {}) {
    return Line.find(filter, null, options).populate('stopIds');
  }

  async countLines(filter = {}, options = {}) {
    const session = options.session;
    return Line.countDocuments(filter).session(session);
  }

  async findLineById(id, { session } = {}) {
    return Line.findById(id).session(session).populate('stopIds');
  }

  async findLineByCode(code, { session } = {}) {
    return Line.findOne({ code }).session(session);
  }

  async createLine(dto, { session } = {}) {
    const line = new Line(dto);
    return line.save({ session });
  }

  async updateLine(id, updateData, { session } = {}) {
    return Line.findByIdAndUpdate(id, updateData, { new: true, session }).populate('stopIds');
  }

  async archiveLine(id, { session } = {}) {
    return Line.findByIdAndUpdate(id, { isArchived: true }, { new: true, session });
  }

  // --- Coaches ---
  async findCoaches(filter = {}, options = {}) {
    return Coach.find(filter, null, options);
  }

  async countCoaches(filter = {}, options = {}) {
    const session = options.session;
    return Coach.countDocuments(filter).session(session);
  }

  async findCoachById(id, { session } = {}) {
    return Coach.findById(id).session(session);
  }

  async findCoachByRegistration(registration, { session } = {}) {
    return Coach.findOne({ registration }).session(session);
  }

  async createCoach(dto, { session } = {}) {
    const coach = new Coach(dto);
    return coach.save({ session });
  }

  async updateCoach(id, updateData, { session } = {}) {
    return Coach.findByIdAndUpdate(id, updateData, { new: true, session });
  }

  async archiveCoach(id, { session } = {}) {
    return Coach.findByIdAndUpdate(id, { isArchived: true }, { new: true, session });
  }

  // --- Departures ---
  async findDepartures(filter = {}, options = {}) {
    return Departure.find(filter, null, options)
      .sort({ createdAt: 1, _id: 1 })
      .populate('lineId coachId');
  }

  async countDepartures(filter = {}, options = {}) {
    const session = options.session;
    return Departure.countDocuments(filter).session(session);
  }

  async findDepartureById(id, { session } = {}) {
    return Departure.findById(id).session(session).populate('lineId coachId');
  }

  async createDeparture(dto, { session } = {}) {
    const departure = new Departure(dto);
    return departure.save({ session });
  }

  // Optimistic concurrency guard via revision increment ($inc: { revision: 1 })
  async guardDeparture(id, expectedStatus, session) {
    return Departure.findOneAndUpdate(
      { _id: id, status: expectedStatus },
      { $inc: { revision: 1 } },
      { new: true, session }
    );
  }

  async departureExists(id, session) {
    const exists = await Departure.exists({ _id: id }).session(session);
    return !!exists;
  }

  // Atomic state transition with revision increment
  async updateDepartureStatus(id, expectedStatus, newStatus, session) {
    return Departure.findOneAndUpdate(
      { _id: id, status: expectedStatus },
      { $set: { status: newStatus }, $inc: { revision: 1 } },
      { new: true, session }
    );
  }
}

module.exports = CatalogueRepository;
module.exports.CatalogueRepository = CatalogueRepository;
