const { withTransaction } = require('../shared/transaction');

/**
 * Annulation cohérente d'un départ :
 * - le départ passe à CANCELLED
 * - toutes les réservations CONFIRMED du départ passent à CANCELLED
 * le tout dans une seule transaction.
 */
function createCancelDepartureUseCase({
  catalogueApi,
  reservationsApi,
  transactionRunner = withTransaction,
}) {
  return async function cancelDeparture(departureId) {
    return transactionRunner(async (session) => {
      const departure = await catalogueApi.cancel(departureId, { session });
      const cancelledBookings = await reservationsApi.cancelConfirmedByDeparture(
        departureId,
        { session }
      );
      return { departure, cancelledBookings };
    });
  };
}

module.exports = { createCancelDepartureUseCase };
