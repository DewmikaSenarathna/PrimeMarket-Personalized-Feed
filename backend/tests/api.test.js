// Integration tests: Express + Mongoose against an in-memory MongoDB.
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createApp } = require('../src/app');
const { User, Listing, Interaction } = require('../src/models');
const { users, listings } = require('../src/data');

let mongod, api;
const feed = async (u) => (await api.get(`/api/users/${u}/recommendations`)).body;
const act = (u, listingId, type, times = 1) =>
  Promise.all(Array.from({ length: times }, () => api.post(`/api/users/${u}/interactions`).send({ listingId, type })));

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  api = request(createApp());
});
afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Listing.deleteMany({}), Interaction.deleteMany({})]);
  await User.insertMany(users);
  await Listing.insertMany(listings);
});

test('1. cold start: new user gets the default popularity feed with mixed categories', async () => {
  const r = await feed('u1');
  expect(r.mode).toBe('cold-start');
  expect(r.items).toHaveLength(24);
  expect(r.items[0].listing._id).toBe('L001');
  expect(new Set(r.items.slice(0, 4).map((i) => i.listing.category)).size).toBe(2);
});

test('2. user-specific recommendations and isolation between users', async () => {
  const u2Before = await feed('u2');
  await act('u1', 'L004', 'contact');          // Amal contacts a Honda Vezel
  await act('u2', 'L023', 'save');             // Nimali saves a Galle villa

  const [a, b] = [await feed('u1'), await feed('u2')];
  expect(a.mode).toBe('personalized');
  expect(a.items[0].listing.category).toBe('vehicle');
  expect(b.items[0].listing.category).toBe('property');
  expect(a.items.map((i) => i.listing._id)).not.toEqual(b.items.map((i) => i.listing._id));
  expect(a.items.map((i) => i.listing._id)).not.toContain('L004');   // contacted -> excluded
  expect(b.items.map((i) => i.listing._id)).not.toContain('L023');   // saved -> excluded

  // u1's activity must not have leaked into u2's ranking.
  const u2OnlyOwn = await Interaction.find({ userId: 'u2' }).lean();
  expect(u2OnlyOwn).toHaveLength(1);
  expect(u2Before.mode).toBe('cold-start');
});

test('3. repeated clicks do not dominate: 50 views lose to a single contact', async () => {
  await act('u1', 'L013', 'view', 50);         // spam-view one apartment
  await act('u1', 'L004', 'contact');          // one contact on a Honda
  const r = await feed('u1');
  const row = await Interaction.findOne({ userId: 'u1', listingId: 'L013', type: 'view' }).lean();
  expect(row.count).toBe(50);                  // stored compactly as one row
  expect(r.items[0].listing._id).toBe('L005'); // Honda Fit: matches contacted make
  expect(r.items.map((i) => i.listing._id).indexOf('L013')).toBeGreaterThan(0); // viewed -> demoted
});

test('4. validation: bad type -> 400, unknown user/listing -> 404', async () => {
  expect((await api.post('/api/users/u1/interactions').send({ listingId: 'L001', type: 'like' })).status).toBe(400);
  expect((await api.post('/api/users/u1/interactions').send({ listingId: 'NOPE', type: 'view' })).status).toBe(404);
  expect((await api.get('/api/users/ghost/recommendations')).status).toBe(404);
});
