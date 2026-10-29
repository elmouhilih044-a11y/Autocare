const systemClock = {
  now: () => new Date(),
};

function createFixedClock(date) {
  const frozen = new Date(date);
  return {
    now: () => new Date(frozen.getTime()),
  };
}

module.exports = { systemClock, createFixedClock };
