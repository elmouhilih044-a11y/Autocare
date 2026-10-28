const City = require('../models/city.model');
const Stop = require('../models/stop.model');
const Line = require('../models/line.model');
const Coach = require('../models/coach.model');

async function seedCatalogue({ session } = {}) {
  // 1. Seed Cities
  const citiesData = [
    { name: 'Casablanca' },
    { name: 'Rabat' },
    { name: 'Marrakech' },
    { name: 'Tanger' },
    { name: 'Fès' },
    { name: 'Agadir' },
  ];

  const cities = {};
  for (const c of citiesData) {
    let city = await City.findOne({ name: c.name }).session(session);
    if (!city) {
      city = await City.create([c], { session }).then((res) => res[0]);
    }
    cities[c.name] = city;
  }

  // 2. Seed Stops
  const stopsData = [
    { name: 'Gare Routière Ouled Ziane', city: 'Casablanca' },
    { name: 'Gare Casa-Voyageurs', city: 'Casablanca' },
    { name: 'Gare Routière Al Kamra', city: 'Rabat' },
    { name: 'Gare Rabat-Ville', city: 'Rabat' },
    { name: 'Gare Routière Bab Doukkala', city: 'Marrakech' },
    { name: 'Gare Routière Tanger Ville', city: 'Tanger' },
    { name: 'Gare Routière Fès Ville', city: 'Fès' },
    { name: 'Gare Routière Al Inbiâat', city: 'Agadir' },
  ];

  const stops = {};
  for (const s of stopsData) {
    const cityId = cities[s.city]._id;
    let stop = await Stop.findOne({ cityId, name: s.name }).session(session);
    if (!stop) {
      stop = await Stop.create([{ name: s.name, cityId }], { session }).then((res) => res[0]);
    }
    stops[s.name] = stop;
  }

  // 3. Seed sample Line
  let lineCasaRabat = await Line.findOne({ code: 'LINE-CAS-RAB' }).session(session);
  if (!lineCasaRabat) {
    lineCasaRabat = await Line.create(
      [
        {
          code: 'LINE-CAS-RAB',
          label: 'Casablanca - Rabat Direct',
          stopIds: [stops['Gare Routière Ouled Ziane']._id, stops['Gare Routière Al Kamra']._id],
          isArchived: false,
        },
      ],
      { session }
    ).then((res) => res[0]);
  }

  // 4. Seed sample Coach
  let coach1 = await Coach.findOne({ registration: '12345-A-6' }).session(session);
  if (!coach1) {
    coach1 = await Coach.create(
      [
        {
          registration: '12345-A-6',
          seatNumbers: Array.from({ length: 40 }, (_, i) => i + 1),
          isArchived: false,
        },
      ],
      { session }
    ).then((res) => res[0]);
  }

  return { cities, stops, line: lineCasaRabat, coach: coach1 };
}

module.exports = { seedCatalogue };
