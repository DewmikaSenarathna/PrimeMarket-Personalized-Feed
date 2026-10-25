const mongoose = require('mongoose');
const config = require('../src/config');
const { User, Listing, Interaction } = require('../src/models');
const storage = require('../src/storage');
const { users, listings, imageKeys } = require('../src/data');

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#dc2626'];

(async () => {
  await mongoose.connect(config.mongoUri);
  await Promise.all([User.deleteMany({}), Listing.deleteMany({}), Interaction.deleteMany({})]);
  await User.insertMany(users);
  await Listing.insertMany(listings);

  // Five tiny generated SVG "photos" (a few hundred bytes each, far under 1 MB).
  let n = 0;
  for (const [listingId, key] of Object.entries(imageKeys)) {
    const title = listings.find((l) => l._id === listingId).title.replace(/&/g, '&amp;');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect width="100%" height="100%" fill="${COLORS[n++ % 5]}"/><text x="50%" y="50%" fill="#fff" font-family="sans-serif" font-size="30" text-anchor="middle">${title}</text></svg>`;
    await storage.putObject(key, Buffer.from(svg), 'image/svg+xml');
  }
  console.log(`Seeded ${users.length} users, ${listings.length} listings, ${n} images (storage: ${config.storageMode})`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
