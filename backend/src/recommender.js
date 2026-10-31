// Rule-based, explainable recommender. Pure functions: no DB access, easy to test.

const WEIGHTS = { view: 1, save: 4, contact: 6 };   // intent strength per interaction type
const REPEAT_CAP = 2;            // repeats can at most double a (listing, type) signal
const HALF_LIFE_DAYS = 14;       // older interest counts for less
const FEATURE_WEIGHTS = { category: 1, subtype: 2, location: 1, band: 0.5 };
const POPULARITY_WEIGHT = 0.05;  // small prior: tie-breaker, and the whole story for cold start
const VIEWED_PENALTY = 0.3;      // seen-but-not-acted listings are demoted, not hidden
const DAY_MS = 86400000;

// Features a listing exposes. `key` is matched against the user's profile.
function features(l) {
  const sub = l.category === 'vehicle' ? l.attributes?.make : l.attributes?.propertyType;
  const band = Math.round(Math.log10(l.price) * 2) / 2; // half-order-of-magnitude price bucket
  return [
    { key: `category:${l.category}`, w: FEATURE_WEIGHTS.category, label: `${l.category} listings` },
    { key: `subtype:${l.category}:${sub}`, w: FEATURE_WEIGHTS.subtype, label: `${sub} ${l.category === 'vehicle' ? 'vehicles' : 'properties'}` },
    { key: `location:${l.location}`, w: FEATURE_WEIGHTS.location, label: `listings in ${l.location}` },
    { key: `band:${l.category}:${band}`, w: FEATURE_WEIGHTS.band, label: 'a similar price range' },
  ];
}

// Strength of one (listing, type) signal: base weight * capped repeat bonus * recency decay.
function interactionStrength(type, count, lastAt, now = new Date()) {
  const repeat = Math.min(1 + Math.log(Math.max(count, 1)), REPEAT_CAP);
  const ageDays = Math.max(0, (now - new Date(lastAt)) / DAY_MS);
  return WEIGHTS[type] * repeat * Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
}

function buildProfile(interactions, listingsById, now) {
  const profile = {};
  for (const i of interactions) {
    const listing = listingsById.get(i.listingId);
    if (!listing) continue;
    const s = interactionStrength(i.type, i.count, i.lastAt, now);
    for (const f of features(listing)) profile[f.key] = (profile[f.key] || 0) + s;
  }
  return profile;
}

// Cold start: most popular first, but alternate categories so the feed isn't one-sided.
function coldStart(listings) {
  const byPop = [...listings].sort((a, b) => b.popularity - a.popularity || a._id.localeCompare(b._id));
  const groups = new Map();
  for (const l of byPop) groups.set(l.category, [...(groups.get(l.category) || []), l]);
  const queues = [...groups.values()];
  const out = [];
  while (queues.some((q) => q.length)) for (const q of queues) if (q.length) out.push(q.shift());
  return out.map((l) => ({ listing: l, score: l.popularity / 100, reasons: ['Popular right now'] }));
}

function rank(listings, interactions, { now = new Date(), limit = 50 } = {}) {
  if (!interactions.length) {
    return { mode: 'cold-start', excludedCount: 0, items: coldStart(listings).slice(0, limit) };
  }
  const byId = new Map(listings.map((l) => [l._id, l]));
  const profile = buildProfile(interactions, byId, now);

  const acted = new Set();   // saved or contacted -> already converted, exclude
  const viewed = new Set();  // only viewed -> demote
  for (const i of interactions) {
    if (i.type === 'view') viewed.add(i.listingId); else acted.add(i.listingId);
  }

  const items = [];
  for (const l of listings) {
    if (acted.has(l._id)) continue;
    const contribs = features(l)
      .map((f) => ({ label: f.label, value: f.w * (profile[f.key] || 0) }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value);
    const affinity = contribs.reduce((s, c) => s + c.value, 0);
    let score = affinity + POPULARITY_WEIGHT * (l.popularity / 100);
    if (viewed.has(l._id)) score *= VIEWED_PENALTY;
    const reasons = contribs.slice(0, 2).map((c) => `Because you showed interest in ${c.label}`);
    if (!reasons.length) reasons.push('Popular right now');
    if (viewed.has(l._id)) reasons.push('You viewed this already (ranked lower)');
    items.push({ listing: l, score: Math.round(score * 1000) / 1000, reasons });
  }
  items.sort((a, b) => b.score - a.score || a.listing._id.localeCompare(b.listing._id));
  return { mode: 'personalized', excludedCount: acted.size, items: items.slice(0, limit) };
}

module.exports = { rank, interactionStrength, WEIGHTS, REPEAT_CAP, HALF_LIFE_DAYS, VIEWED_PENALTY };
