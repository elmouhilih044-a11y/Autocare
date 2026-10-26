const { City, Stop } = require('../models/city.model');
const { Line } = require('../models/line.model');
const { Coach } = require('../models/coach.model');
const { Departure } = require('../models/departure.model');

class CatalogueRepository {
  async findCities(filter = {}, options = {}) {
    return City.find(filter, null, options);
  }

  async findStops(filter = {}, options = {}) {
    return Stop.find(filter, null, options);
  }

  async findLines(filter = {}, options = {}) {
    return Line.find(filter, null, options).populate('stopIds');
  }

  async findLineById(id) {
    return Line.findById(id).populate('stopIds');
  }

  async findCoaches(filter = {}, options = {}) {
    return Coach.find(filter, null, options);
  }

  async findCoachById(id) {
    return Coach.findById(id);
  }

  async findDepartures(filter = {}, options = {}) {
    return Departure.find(filter, null, options).populate('lineId coachId');
  }

  async findDepartureById(id, { session } = {}) {
    return Departure.findById(id).session(session);
  }

  async createLine(dto, { session } = {}) {
    const line = new Line(dto);
    return line.save({ session });
  }

  async createCoach(dto, { session } = {}) {
    const coach = new Coach(dto);
    return coach.save({ session });
  }

  async createDeparture(dto, { session } = {}) {
    const departure = new Departure(dto);
    return departure.save({ session });
  }

  // آلية حراسة التزامن (Guard Departure) وتحديث الـ Revision بمقدار 1 (ADR-3 & Section 3.8)
  async guardDeparture(id, expectedStatus, session) {
    return Departure.findOneAndUpdate(
      { _id: id, status: expectedStatus },
      { $inc: { revision: 1 } },
      { new: true, session }
    );
  }

  async departureExists(id, session) {
    const count = await Departure.exists({ _id: id }).session(session);
    return !!count;
  }
}

module.exports = { CatalogueRepository };