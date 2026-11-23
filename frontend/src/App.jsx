import { useCallback, useEffect, useState } from 'react';
import { getUsers, getFeed, getActivity, record } from './api.js';

const fmt = (l) => `${l.currency} ${l.price.toLocaleString('en-LK')}`;
const detail = (l) =>
  l.category === 'vehicle'
    ? `${l.attributes.make} ${l.attributes.model} · ${l.attributes.year} · ${l.attributes.fuel}`
    : `${l.attributes.propertyType}${l.attributes.bedrooms ? ` · ${l.attributes.bedrooms} BR` : ''} · ${l.attributes.areaSqft} sqft`;

function Card({ item, onAction }) {
  const { listing: l, reasons, score } = item;
  const [open, setOpen] = useState(false);
  return (
    <article className="card">
      {l.imageKey && <img src={`/api/images/${l.imageKey}`} alt={l.title} loading="lazy" />}
      <div className="body">
        <span className={`tag ${l.category}`}>{l.category}</span>
        <h3>{l.title}</h3>
        <p className="meta">{l.location} · {fmt(l)}</p>
        <p className="meta">{detail(l)}</p>
        <p className="why">💡 {reasons.join(' · ')} <span className="score">({score})</span></p>
        <div className="actions">
          <button onClick={() => { if (!open) onAction(l._id, 'view'); setOpen(!open); }}>{open ? 'Hide' : 'View details'}</button>
          <button onClick={() => onAction(l._id, 'save')}>♡ Save</button>
          <button className="primary" onClick={() => { onAction(l._id, 'contact'); alert(`Seller of "${l.title}" has been notified (demo).`); }}>Contact seller</button>
        </div>
        {open && <p className="detail">Listing {l._id}. Full description would appear here; opening this panel recorded a <b>view</b>.</p>}
      </div>
    </article>
  );
}

export default function App() {
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState(() => localStorage.getItem('pm_user'));
  const [feed, setFeed] = useState(null);
  const [activity, setActivity] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => { getUsers().then(setUsers).catch((e) => setError(e.message)); }, []);

  const refresh = useCallback(async (id) => {
    try {
      const [f, a] = await Promise.all([getFeed(id), getActivity(id)]);
      setFeed(f); setActivity(a); setError('');
    } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { if (userId) { localStorage.setItem('pm_user', userId); refresh(userId); } }, [userId, refresh]);

  const act = async (listingId, type) => {
    try { await record(userId, listingId, type); await refresh(userId); } catch (e) { setError(e.message); }
  };

  const saved = activity.filter((a) => a.counts.save || a.counts.contact);

  return (
    <div className="page">
      <header>
        <h1>PrimeMarket <small>personalized feed</small></h1>
        <div className="users">
          {users.map((u) => (
            <button key={u._id} className={u._id === userId ? 'active' : ''} onClick={() => setUserId(u._id)}>{u.name}</button>
          ))}
        </div>
      </header>

      {error && <p className="error">⚠ {error} (is the API running on :4000?)</p>}
      {!userId && <p className="hint">Select a test user above to see their feed.</p>}

      {feed && (
        <>
          <p className="banner">
            {feed.mode === 'cold-start'
              ? 'New here — showing popular listings. Interact with a few to personalize.'
              : `Personalized from your activity. ${feed.excludedCount} saved/contacted listing(s) hidden from the feed.`}
          </p>
          {saved.length > 0 && (
            <section className="activity">
              <h2>Your saved &amp; contacted</h2>
              <ul>{saved.map((a) => (
                <li key={a.listing._id}>{a.listing.title}
                  {a.counts.save ? ' · saved' : ''}{a.counts.contact ? ' · contacted' : ''}</li>
              ))}</ul>
            </section>
          )}
          <div className="grid">{feed.items.map((it) => <Card key={it.listing._id} item={it} onAction={act} />)}</div>
        </>
      )}
    </div>
  );
}
