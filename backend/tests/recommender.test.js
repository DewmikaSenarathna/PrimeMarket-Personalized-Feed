// Pure unit tests (no database needed).
const { rank, interactionStrength } = require('../src/recommender');
const { listings } = require('../src/data');

const now = new Date();
const ix = (listingId, type, count = 1, lastAt = now) => ({ listingId, type, count, lastAt });

test('repeated views are capped: 5 views and 500 views carry equal weight', () => {
  expect(interactionStrength('view', 500, now, now)).toBe(interactionStrength('view', 5, now, now));
  expect(interactionStrength('view', 5, now, now)).toBeLessThan(interactionStrength('contact', 1, now, now));
});

test('older interactions count for less (recency decay)', () => {
  const old = new Date(now - 14 * 86400000);
  expect(interactionStrength('save', 1, old, now)).toBeCloseTo(interactionStrength('save', 1, now, now) / 2);
});

test('cold start alternates categories and leads with the most popular listing', () => {
  const r = rank(listings, []);
  expect(r.mode).toBe('cold-start');
  expect(r.items[0].listing._id).toBe('L001');
  expect(new Set(r.items.slice(0, 4).map((i) => i.listing.category)).size).toBe(2);
});

test('saved/contacted listings are excluded; viewed-only listings are demoted', () => {
  const r = rank(listings, [ix('L004', 'contact'), ix('L013', 'view', 3)]);
  const ids = r.items.map((i) => i.listing._id);
  expect(ids).not.toContain('L004');
  expect(ids).toContain('L013');
  expect(ids.indexOf('L013')).toBeGreaterThan(5);
});
