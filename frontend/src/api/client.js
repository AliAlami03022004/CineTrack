const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

async function handle(res) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with ${res.status}`);
  }
  return res.json();
}

export function getHome() {
  return fetch(`${API_BASE}/home`).then(handle);
}

export function getSearch(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") search.set(k, v);
  });
  return fetch(`${API_BASE}/search?${search.toString()}`).then(handle);
}

export function postSearchWatchlist(media) {
  const mediaId = media?.id ?? media;
  return fetch(`${API_BASE}/search/watchlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mediaId, media })
  }).then(handle);
}

export function deleteSearchWatchlist(media) {
  const mediaId = media?.id ?? media;
  return fetch(`${API_BASE}/search/watchlist`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mediaId })
  }).then(handle);
}

export function getDiscovery() {
  return fetch(`${API_BASE}/discovery`).then(handle);
}

export function postDiscoveryLike(mediaId) {
  const media = mediaId ?? {};
  const id = media?.id ?? media;
  return fetch(`${API_BASE}/discovery/like`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mediaId: id, media })
  }).then(handle);
}
