const errors = require('../services/reservations.errors');

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

function validateId(id) {
  if (!OBJECT_ID.test(id)) throw errors.invalidInput('Identifiant invalide.');
}

function validateBookingBody(body) {
  const keys = Object.keys(body || {});
  if (keys.length !== 1 || keys[0] !== 'seatNumber') {
    throw errors.invalidInput('Le corps doit contenir seulement seatNumber.');
  }
  if (!Number.isInteger(body.seatNumber) || body.seatNumber < 1) {
    throw errors.invalidInput('seatNumber doit être un entier positif.');
  }
}

class ReservationsController {
  constructor({ reservationsService }) {
    this.reservationsService = reservationsService;
  }

  createBooking = async (req, res, next) => {
    try {
      validateId(req.params.id);
      validateBookingBody(req.body);
      const booking = await this.reservationsService.createBooking(
        req.user,
        req.params.id,
        req.body.seatNumber
      );
      res.status(201).json({ success: true, data: booking });
    } catch (err) {
      next(err);
    }
  };

  cancelBooking = async (req, res, next) => {
    try {
      validateId(req.params.id);
      const booking = await this.reservationsService.cancelBooking(req.user, req.params.id);
      res.status(200).json({ success: true, data: booking });
    } catch (err) {
      next(err);
    }
  };

  listBookings = async (req, res, next) => {
    try {
      const result = await this.reservationsService.listBookings(req.user, req.query);
      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  };

  getDepartureSeats = async (req, res, next) => {
    try {
      validateId(req.params.id);
      const seats = await this.reservationsService.getDepartureSeats(req.params.id);
      res.status(200).json({ success: true, data: seats });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { ReservationsController };
module.exports.ReservationsController = ReservationsController;
