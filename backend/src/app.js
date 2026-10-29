const express = require('express');
const cors = require('cors');
const { User, Listing, Interaction, TYPES } = require('./models');
const { rank } = require('./recommender');
const storage = require('./storage');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.get('/api/users', wrap(async (req, res) => res.json(await User.find().lean())));
  app.get('/api/listings', wrap(async (req, res) => res.json(await Listing.find().lean())));

  // Resolve :userId once for every /api/users/:userId/* route.
  app.param('userId', (req, res, next, id) => {
    User.findById(id).lean().then((u) => {
      if (!u) return res.status(404).json({ error: 'Unknown user' });
      req.user = u; next();
    }).catch(next);
  });

  app.get('/api/users/:userId/recommendations', wrap(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const [listings, interactions] = await Promise.all([
      Listing.find().lean(),
      Interaction.find({ userId: req.user._id }).lean(), // strictly this user's data
    ]);
    res.json({ userId: req.user._id, ...rank(listings, interactions, { limit }) });
  }));

  app.post('/api/users/:userId/interactions', wrap(async (req, res) => {
    const { listingId, type } = req.body || {};
    if (!TYPES.includes(type)) return res.status(400).json({ error: `type must be one of ${TYPES.join(', ')}` });
    if (!(await Listing.exists({ _id: listingId }))) return res.status(404).json({ error: 'Unknown listing' });
    const doc = await Interaction.findOneAndUpdate(
      { userId: req.user._id, listingId, type },
      { $inc: { count: 1 }, $set: { lastAt: new Date() } },
      { upsert: true, new: true }
    ).lean();
    res.status(201).json(doc);
  }));

  // Per-listing activity summary (used by the UI for "Your activity").
  app.get('/api/users/:userId/interactions', wrap(async (req, res) => {
    const rows = await Interaction.find({ userId: req.user._id }).lean();
    const listings = new Map((await Listing.find({ _id: { $in: rows.map((r) => r.listingId) } }).lean()).map((l) => [l._id, l]));
    const grouped = {};
    for (const r of rows) {
      grouped[r.listingId] ||= { listing: listings.get(r.listingId), counts: { view: 0, save: 0, contact: 0 } };
      grouped[r.listingId].counts[r.type] = r.count;
    }
    res.json(Object.values(grouped));
  }));

  app.get('/api/images/:key', wrap(async (req, res) => {
    try {
      const { stream, contentType } = await storage.getObject(req.params.key);
      res.set({ 'Content-Type': contentType, 'Cache-Control': 'private, max-age=300' });
      stream.pipe(res);
    } catch {
      res.status(404).json({ error: 'Image not found' });
    }
  }));

  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });
  return app;
}

module.exports = { createApp };
