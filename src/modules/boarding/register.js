const { asClass, asFunction, asValue } = require('awilix');
const { BoardingRecord } = require('./models/boardingRecord.model');
const { BoardingRecordRepository } = require('./repositories/boardingRecord.repository');
const { BoardingService } = require('./services/boarding.service');
const BoardingController = require('./controllers/boarding.controller');
const createBoardingRouter = require('./routes/boarding.routes');

function register(container) {
  container.register({
    boardingRecordModel: asValue(BoardingRecord),
    boardingRecordRepository: asClass(BoardingRecordRepository).singleton(),
    boardingService: asClass(BoardingService).singleton(),
    boardingController: asClass(BoardingController).singleton(),
    boardingRouter: asFunction(createBoardingRouter).singleton(),
  });
}

module.exports = { register };