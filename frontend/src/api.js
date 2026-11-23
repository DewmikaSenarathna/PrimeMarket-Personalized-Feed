const json = async (res) => {
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
  return res.json();
};

export const getUsers = () => fetch('/api/users').then(json);
export const getFeed = (userId) => fetch(`/api/users/${userId}/recommendations`).then(json);
export const getActivity = (userId) => fetch(`/api/users/${userId}/interactions`).then(json);
export const record = (userId, listingId, type) =>
  fetch(`/api/users/${userId}/interactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listingId, type }),
  }).then(json);
