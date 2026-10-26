class CatalogueController {
  constructor({ catalogueService }) {
    Object.assign(this, { catalogueService });
  }

  getCities = async (req, res, next) => {
    try {
      const cities = await this.catalogueService.getCities();
      res.status(200).json({ success: true, data: cities });
    } catch (error) {
      next(error);
    }
  };

  getStops = async (req, res, next) => {
    try {
      const stops = await this.catalogueService.getStops();
      res.status(200).json({ success: true, data: stops });
    } catch (error) {
      next(error);
    }
  };

  getLines = async (req, res, next) => {
    try {
      const lines = await this.catalogueService.getLines();
      res.status(200).json({ success: true, data: lines });
    } catch (error) {
      next(error);
    }
  };

  getCoaches = async (req, res, next) => {
    try {
      const coaches = await this.catalogueService.getCoaches();
      res.status(200).json({ success: true, data: coaches });
    } catch (error) {
      next(error);
    }
  };

  getDepartures = async (req, res, next) => {
    try {
      const departures = await this.catalogueService.getDepartures();
      res.status(200).json({ success: true, data: departures });
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

  createLine = async (req, res, next) => {
    try {
      const line = await this.catalogueService.createLine(req.body);
      res.status(201).json({ success: true, data: line });
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

  archiveCoach = async (req, res, next) => {
    try {
      // منطق الأرشفة
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  updateLineCoach = async (req, res, next) => {
    try {
      res.status(200).json({ success: true, message: "Line coach updated" });
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

module.exports = { CatalogueController };