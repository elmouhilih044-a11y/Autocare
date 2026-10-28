const { createTestDates, HOUR_MS } = require('../../../src/shared/test-dates');
const { createFixedClock } = require('../../../src/shared/clock');

describe('dynamic test dates', () => {
  it('builds departure and arrival relative to a frozen clock', () => {
    const now = new Date('2026-10-28T12:00:00.000Z');
    const clock = createFixedClock(now);
    const dates = createTestDates(clock.now());

    expect(dates.now.toISOString()).toBe('2026-10-28T12:00:00.000Z');
    expect(dates.departureAt.getTime()).toBe(now.getTime() + 24 * HOUR_MS);
    expect(dates.arrivalAt.getTime()).toBe(now.getTime() + 26 * HOUR_MS);
    expect(dates.departureAtIso).toBe(dates.departureAt.toISOString());
  });
});
