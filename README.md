# PrimeMarket.lk - Personalized Marketplace Feed

MERN-style app (React + Express + MongoDB) with an explainable, rule-based recommender and a private-S3-backed image path (with a zero-cost local mock).

## Quick start

Requirements: Node 18+, a MongoDB instance (local `mongod` or a free Atlas cluster).

```bash
# 1. Backend
cd backend
cp .env.example .env          
npm install
npm run seed                  
npm run dev                 

# 2. Frontend 
cd frontend
npm install
npm run dev                   
```

### Tests
```bash
cd backend && npm test
```
`tests/recommender.test.js` are pure unit tests. `tests/api.test.js` are integration tests (Express + Mongoose) using `mongodb-memory-server`, which downloads a MongoDB binary on first run.

## Switching users
Two seeded test users: **Amal Perera (`u1`)** and **Nimali Fernando (`u2`)**. Click either name in the header. The choice is stored in `localStorage` and *all activity is stored in MongoDB under that user id*, so after closing the tab, opening a fresh browser/incognito window and selecting the same user, their personalized feed is rebuilt from the database. There is no password or JWT, by design.

Suggested demo: as Amal, click **Contact seller** on *Honda Vezel* and view a Toyota → feed shifts to vehicles. Switch to Nimali, **Save** the *Beachside Villa* → feed shifts to Galle/property listings. Reload / use a fresh browser and compare.

## API
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/users` | the two test users |
| GET | `/api/listings` | all listings |
| GET | `/api/users/:userId/recommendations` | ranked feed with `mode`, `score`, `reasons` |
| POST | `/api/users/:userId/interactions` | body `{listingId, type: view\|save\|contact}` |
| GET | `/api/users/:userId/interactions` | per-listing activity summary |
| GET | `/api/images/:key` | streams a private-bucket image through the backend |

## Data model
- **User** `{_id, name}`; **Listing** `{_id, title, category, location, price, attributes, popularity, imageKey}`.
- **Interaction** - *one aggregated row per (user, listing, type)* with `count` and `lastAt`, enforced by a unique compound index and updated with an atomic `$inc` upsert. Repeated clicks never create unbounded rows or race conditions.

## Ranking logic (`backend/src/recommender.js`)

**1. Signal strength** of each (listing, type) interaction:

`strength = typeWeight × min(1 + ln(count), 2) × 0.5^(ageDays / 14)`

| Type | Weight | Reasoning |
|---|---|---|
| view | 1 | weak, cheap, accidental clicks happen |
| save | 4 | clear intent to return |
| contact | 6 | strongest buying intent |

**2. Interest profile.** Each interaction adds its strength to the listing's features: category, subtype (vehicle make / property type), location and a price band (half-order-of-magnitude bucket, so Rs 5.9M and 11.5M cars share a band).

**3. Listing score** = Σ featureWeight × profile[feature] + 0.05 × popularity/100, with feature weights **subtype 2, category 1, location 1, price band 0.5**. Subtype is weighted highest because "Honda" says more about taste than "vehicle".

**4. Repeat handling.** Counts grow logarithmically and are capped at **2×** the base weight. 5 views and 500 views score the same and 50 views of one listing can never outweigh one contact. Raw counts are still stored.

**5. Already-seen listings.** *Saved or contacted* listings are excluded from the feed (the user already converted; they appear in the "Your saved & contacted" panel). *View-only* listings stay but are multiplied by **0.3**, since a viewer may want to revisit but shouldn't see the same card on top forever.

**6. Cold start** (no interactions): popularity-ordered, interleaved across categories so a first-time user sees both vehicles and properties.

**7. Explainability.** Each item returns `reasons` built from its two largest feature contributions, e.g. *"Because you showed interest in Honda vehicles"*, plus a demotion note for viewed items. The UI shows them on every card.

### Trade-offs
- Content-based only: no collaborative filtering, so it can't surface "users like you" items (it would need more users).
- Weights are hand-tuned constants, easy to read and change, but not learned.
- Interest decays with a 14-day half-life evaluated at request time; the aggregated row stores only `lastAt`, so several clicks over weeks are treated as if they all happened at the latest time. A per-event log would be more accurate at higher storage cost.
- Ranking runs in memory over all listings: fine for dozens/hundreds; at scale you'd pre-filter candidates in Mongo.
- Contact Seller is a demo action (records the interaction and shows an alert).

## Image storage: private S3, with a local mock
The browser never receives S3 URLs or credentials. It requests `/api/images/:key`; the backend reads the object using server-side credentials and streams it. Keys are validated against `^[A-Za-z0-9._-]+$`.

`STORAGE_MODE` in `backend/.env`:

- **`local` (default, zero cost)** - the mock bucket is the folder `backend/local-bucket/`, populated by `npm run seed`. This matches the brief's "approved local mock" option. *Confirm with the recruitment team that it's acceptable if you submit this way.*
- **`s3`** - real AWS S3 via the AWS SDK v3.

### Using real S3 (only if you have free access)
1. In the AWS console, create a bucket (any region) with **Block all public access ON** (default) and no bucket policy. Stay inside the free tier / credits. Upload nothing large (the seed images are a few hundred bytes).
2. Create a budget alert (Billing → Budgets, e.g. $1) as a safeguard.
3. Create an IAM user with a minimal policy and an access key:
   ```json
   { "Version": "2012-10-17",
     "Statement": [{ "Effect": "Allow",
       "Action": ["s3:GetObject", "s3:PutObject"],
       "Resource": "arn:aws:s3:::YOUR_BUCKET/*" }] }
   ```
4. Put values in `backend/.env` (git-ignored) or `aws configure`:
   ```
   STORAGE_MODE=s3
   AWS_REGION=ap-south-1
   S3_BUCKET=YOUR_BUCKET
   AWS_ACCESS_KEY_ID=...        
   AWS_SECRET_ACCESS_KEY=...
   ```
5. `npm run seed` uploads the 5 images; restart the API. Delete the access key afterwards.

Credentials only ever live in the backend environment: never in the frontend or the repo (`.env` is git-ignored; `.env.example` has placeholders only).

## Project layout
```
backend/  src/{app,models,recommender,storage,data,server}.js  scripts/seed.js  tests/
frontend/ src/{App.jsx,api.js,styles.css}
```
