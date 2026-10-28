class CatalogueController {
  constructor({ catalogueService }) {
    this.catalogueService = catalogueService;
  }

  // --- Cities ---
  getCities = async (req, res, next) => {
    try {
      const result = await this.catalogueService.getCities(req.query);
      res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  };

  getCityById = async (req, res, next) => {
    try {
      const city = await this.catalogueService.getCityById(req.params.id);
      res.status(200).json({ success: true, data: city });
    } catch (error) {
      next(error);
    }
  };

  // --- Stops ---
  getStops = async (req, res, next) => {
    try {
      const result = await this.catalogueService.getStops(req.query);
      res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  };

  getStopById = async (req, res, next) => {
    try {
      const stop = await this.catalogueService.getStopById(req.params.id);
      res.status(200).json({ success: true, data: stop });
    } catch (error) {
      next(error);
    }
  };

  // --- Lines ---
  getLines = async (req, res, next) => {
    try {
      const result = await this.catalogueService.getLines(req.query);
      res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  };

  getLineById = async (req, res, next) => {
    try {
      const line = await this.catalogueService.getLineById(req.params.id);
      res.status(200).json({ success: true, data: line });
    } catch (error) {
      next(error);
    }
  };

  createLine = async (req, res, next) => {
    try {
      const line = await this.catalogueService.createLine(req.body);
      res.status(201).json({ success: true, data: line });
    } catch (error) {
      next(error);
    }
  };

  updateLine = async (req, res, next) => {
    try {
      const line = await this.catalogueService.updateLine(req.params.id, req.body);
      res.status(200).json({ success: true, data: line });
    } catch (error) {
      next(error);
    }
  };

  archiveLine = async (req, res, next) => {
    try {
      await this.catalogueService.archiveLine(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  updateLineCoach = async (req, res, next) => {
    try {
      res.status(200).json({ success: true, message: 'Line coach updated' });
    } catch (error) {
      next(error);
    }
  };

  removeLineCoach = async (req, res, next) => {
    try {
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // --- Coaches ---
  getCoaches = async (req, res, next) => {
    try {
      const result = await this.catalogueService.getCoaches(req.query);
      res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  };

  getCoachById = async (req, res, next) => {
    try {
      const coach = await this.catalogueService.getCoachById(req.params.id);
      res.status(200).json({ success: true, data: coach });
    } catch (error) {
      next(error);
    }
  };

  createCoach = async (req, res, next) => {
    try {
      const coach = await this.catalogueService.createCoach(req.body);
      res.status(201).json({ success: true, data: coach });
    } catch (error) {
      next(error);
    }
  };

  updateCoach = async (req, res, next) => {
    try {
      const coach = await this.catalogueService.updateCoach(req.params.id, req.body);
      res.status(200).json({ success: true, data: coach });
    } catch (error) {
      next(error);
    }
  };

  archiveCoach = async (req, res, next) => {
    try {
      await this.catalogueService.archiveCoach(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // --- Departures ---
  getDepartures = async (req, res, next) => {
    try {
      const result = await this.catalogueService.getDepartures(req.query);
      res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  };

  getDepartureById = async (req, res, next) => {
    try {
      const departure = await this.catalogueService.getDepartureById(req.params.id);
      res.status(200).json({ success: true, data: departure });
    } catch (error) {
      next(error);
    }
  };

  createDeparture = async (req, res, next) => {
    try {
      const departure = await this.catalogueService.createDeparture(req.body);
      res.status(201).json({ success: true, data: departure });
    } catch (error) {
      next(error);
    }
  };

  startBoarding = async (req, res, next) => {
    try {
      const departure = await this.catalogueService.updateStatus(req.params.id, 'BOARDING');
      res.status(200).json({ success: true, data: departure });
    } catch (error) {
      next(error);
    }
  };

  depart = async (req, res, next) => {
    try {
      const departure = await this.catalogueService.updateStatus(req.params.id, 'DEPARTED');
      res.status(200).json({ success: true, data: departure });
    } catch (error) {
      next(error);
    }
  };

  cancelDeparture = async (req, res, next) => {
    try {
      const departure = await this.catalogueService.updateStatus(req.params.id, 'CANCELLED');
      res.status(200).json({ success: true, data: departure });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = CatalogueController;
module.exports.CatalogueController = CatalogueController;
