/**
 * Lightweight in-memory movie/series helpers for Phase 0 wiring.
 * Replace these with real TMDB + database logic in later phases.
 */
const seedMedia = [
  { id: 1, title: "Inception", type: "movie", runtime: 148, year: 2010, genres: ["sci-fi", "thriller"], score: 9.0, featured: true },
  { id: 2, title: "The Dark Knight", type: "movie", runtime: 152, year: 2008, genres: ["action", "crime"], score: 9.1, featured: true },
  { id: 3, title: "Breaking Bad", type: "tv", runtime: 50, year: 2008, genres: ["crime", "drama"], score: 9.5, featured: false },
  { id: 4, title: "The Bear", type: "tv", runtime: 32, year: 2022, genres: ["drama"], score: 8.6, featured: true },
  { id: 5, title: "Everything Everywhere All at Once", type: "movie", runtime: 139, year: 2022, genres: ["sci-fi", "adventure"], score: 8.1, featured: false }
];

let viewedMedia = seedMedia.slice(0, 3);
let watchlist = seedMedia.slice(3);

export function getApiConfig() {
  return { apiKey: process.env.TMDB_API_KEY ?? "dev-placeholder" };
}

export function getViewedMedia() {
  return viewedMedia;
}

export function getWatchlist() {
  return watchlist;
}

export function addToWatchlist(mediaId) {
  const item = seedMedia.find(m => m.id === mediaId);
  if (item && !watchlist.some(m => m.id === mediaId)) {
    watchlist = [...watchlist, item];
  }
  return watchlist;
}

export function getTopPicks(limit = 3) {
  return [...viewedMedia].sort((a, b) => b.score - a.score).slice(0, limit);
}

export function computeRuntimeMinutes(items) {
  return items.reduce((total, item) => total + (item.runtime ?? 0), 0);
}

export function getFeatured(timeWindow = "week") {
  return seedMedia.filter(m => m.featured).map(m => ({ ...m, timeWindow }));
}

export function searchMedia(query = "", filters = {}, page = 1) {
  const normalizedQuery = query.toLowerCase();
  let results = seedMedia.filter(m => m.title.toLowerCase().includes(normalizedQuery));

  if (filters.type) results = results.filter(m => m.type === filters.type);
  if (filters.year) results = results.filter(m => m.year === Number(filters.year));
  if (filters.genre) results = results.filter(m => m.genres.includes(filters.genre));

  return {
    query,
    page,
    totalResults: results.length,
    results
  };
}

export function getRecommendations() {
  return seedMedia.filter(m => m.score >= 8.5);
}

export function resetInMemoryData() {
  viewedMedia = seedMedia.slice(0, 3);
  watchlist = seedMedia.slice(3);
}
