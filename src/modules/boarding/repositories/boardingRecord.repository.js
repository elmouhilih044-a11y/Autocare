class BoardingRecordRepository {
  constructor({ boardingRecordModel }) {
    this.BoardingRecord = boardingRecordModel;
  }

  async create({ bookingId, departureId, agentId, checkedAt }, { session } = {}) {
    const [record] = await this.BoardingRecord.create(
      [{ bookingId, departureId, agentId, checkedAt }],
      { session }
    );
    return record.toObject();
  }

  findByBookingId(bookingId, { session } = {}) {
    return this.BoardingRecord.findOne({ bookingId }, null, { session }).lean();
  }

  countByDeparture(departureId, { session } = {}) {
    return this.BoardingRecord.countDocuments({ departureId }, { session });
  }
}

module.exports = { BoardingRecordRepository };