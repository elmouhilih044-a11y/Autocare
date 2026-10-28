const { withTransaction } = require('../shared/transaction');

function createCancelDepartureUseCase({ catalogueApi }) {
  return async function cancelDeparture(departureId) {
    return withTransaction(async (session) => {
      return catalogueApi.cancel(departureId, { session });
    });
  };
}

module.exports = { createCancelDepartureUseCase };
