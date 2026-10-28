/**
 * Public Contract for Catalogue Module (Task 1: ST-10)
 * External modules (Reservations, Boarding, etc.) interact with the Catalogue
 * domain exclusively via this contract.
 */
function createCatalogueApi({ catalogueService }) {
  return {
    /**
     * Get Departure by ID (returns DepartureView)
     * @param {string} id - Departure ObjectId string
     * @param {object} [options] - Options including transaction session { session }
     */
    async getDeparture(id, options = {}) {
      const session = options.session;
      return catalogueService.getDepartureById(id, { session });
    },

    /**
     * Guard departure status with conditional write & revision increment
     * @param {string} id - Departure ID
     * @param {object|string} expectedStatusOrOptions - Expected status or options { expectedStatus, session }
     * @param {object} [maybeOptions] - Options { session } if 2nd arg was string
     */
    async guardDeparture(id, expectedStatusOrOptions = {}, maybeOptions = {}) {
      return catalogueService.guardDeparture(id, expectedStatusOrOptions, maybeOptions);
    },

    /**
     * Transition departure status to BOARDING
     * @param {string} id - Departure ID
     * @param {object} [options] - { session }
     */
    async startBoarding(id, options = {}) {
      return catalogueService.updateStatus(id, 'BOARDING', options);
    },

    /**
     * Transition departure status to DEPARTED
     * @param {string} id - Departure ID
     * @param {object} [options] - { session }
     */
    async depart(id, options = {}) {
      return catalogueService.updateStatus(id, 'DEPARTED', options);
    },

    /**
     * Transition departure status to CANCELLED
     * @param {string} id - Departure ID
     * @param {object} [options] - { session }
     */
    async cancel(id, options = {}) {
      return catalogueService.updateStatus(id, 'CANCELLED', options);
    },
  };
}

module.exports = { createCatalogueApi };
