const HOUR_MS = 60 * 60 * 1000;

/**
 * Dates relative to "now" so tests do not depend on a hardcoded calendar day.
 * @param {Date|number|string} [now]
 */
function createTestDates(now = new Date()) {
  const t = new Date(now).getTime();
  const departureAt = new Date(t + 24 * HOUR_MS);
  const arrivalAt = new Date(t + 26 * HOUR_MS);
  const boardingWindowAt = new Date(t + HOUR_MS);
  const pastAt = new Date(t - 24 * HOUR_MS);

  return {
    now: new Date(t),
    departureAt,
    arrivalAt,
    boardingWindowAt,
    pastAt,
    departureAtIso: departureAt.toISOString(),
    arrivalAtIso: arrivalAt.toISOString(),
    boardingWindowAtIso: boardingWindowAt.toISOString(),
    pastAtIso: pastAt.toISOString(),
  };
}

module.exports = { createTestDates, HOUR_MS };
