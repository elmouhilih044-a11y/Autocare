const { AppError } = require('../../../shared/errors');

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

class BoardingController {
  constructor({ boardingService }) {
    this.boardingService = boardingService;
  }

  checkTicket = async (req, res, next) => {
    try {
      const departureId = req.params.id;
      const body = req.body || {};

      if (!OBJECT_ID.test(departureId)) {
        throw new AppError('INVALID_INPUT', 400, 'Invalid departure id');
      }
      // Only ticketCode is allowed: no agentId, no checkedAt from the client
      const keys = Object.keys(body);
      if (keys.length !== 1 || keys[0] !== 'ticketCode') {
        throw new AppError('INVALID_INPUT', 400, 'Body must contain only ticketCode');
      }
      if (typeof body.ticketCode !== 'string' || body.ticketCode.trim() === '') {
        throw new AppError('INVALID_INPUT', 400, 'ticketCode is required');
      }

      // ASSUMPTION (only one): the authenticated user is on req.user with an `id` field.
      // Identity is still empty, so I can't check this yet.
      const record = await this.boardingService.checkTicket({
        departureId,
        ticketCode: body.ticketCode.trim(),
        agentId: req.user.id,
      });

      res.status(201).json({ success: true, data: record });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = BoardingController;
module.exports.BoardingController = BoardingController;