/**
 * Movie/series helpers with TMDB v3 support, in-memory cache (TTL),
 * basic request throttling, and fallbacks when TMDB is unavailable.
 */
import dotenv from "dotenv";
dotenv.config();

console.log("HAS AUTH =", hasTmdbAuth());
console.log("API KEY =", process.env.TMDB_API_KEY);
console.log("READ TOKEN =", process.env.TMDB_READ_TOKEN);

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MIN_INTERVAL_MS = 150; // simple rate limit between requests

const cache = new Map(); // key -> { expiresAt, data }
const inflight = new Map(); // key -> Promise
let lastRequestAt = 0;

const seedMedia = [
  { id: 1, title: "Inception", type: "movie", runtime: 148, year: 2010, genres: ["sci-fi", "thriller"], score: 9.0, featured: true },
  { id: 2, title: "The Dark Knight", type: "movie", runtime: 152, year: 2008, genres: ["action", "crime"], score: 9.1, featured: true },
  { id: 3, title: "Breaking Bad", type: "tv", runtime: 50, year: 2008, genres: ["crime", "drama"], score: 9.5, featured: false },
  { id: 4, title: "The Bear", type: "tv", runtime: 32, year: 2022, genres: ["drama"], score: 8.6, featured: true },
  { id: 5, title: "Everything Everywhere All at Once", type: "movie", runtime: 139, year: 2022, genres: ["sci-fi", "adventure"], score: 8.1, featured: false }
];

let viewedMedia = seedMedia.slice(0, 3);
let watchlist = seedMedia.slice(3);

function hasTmdbAuth() {
  return Boolean(process.env.TMDB_READ_TOKEN || process.env.TMDB_API_KEY);
}

export function getApiConfig() {
  return {
    apiKey: process.env.TMDB_API_KEY ?? null,
    readToken: process.env.TMDB_READ_TOKEN ?? null
  };
}

function buildUrl(path, params = {}) {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  const { apiKey, readToken } = getApiConfig();
  const useApiKeyParam = Boolean(apiKey && !readToken);

  const merged = { ...params };
  if (useApiKeyParam) merged.api_key = apiKey;

  Object.entries(merged).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.append(k, v);
  });
  return { url: url.toString(), headers: readToken ? { Authorization: `Bearer ${readToken}` } : {} };
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function throttledFetch(url, options) {
  const now = Date.now();
  const delta = now - lastRequestAt;
  if (delta < MIN_INTERVAL_MS) {
    await sleep(MIN_INTERVAL_MS - delta);
  }
  lastRequestAt = Date.now();

  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`TMDB error ${res.status}: ${text}`.trim());
  }
  return res.json();
}

async function requestWithCache(key, path, params = {}, ttlMs = DEFAULT_TTL_MS) {
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) return cached.data;

  if (inflight.has(key)) return inflight.get(key);

  const { url, headers } = buildUrl(path, params);
  const promise = (async () => {
    try {
      const data = await throttledFetch(url, { headers });
      cache.set(key, { data, expiresAt: Date.now() + ttlMs });
      return data;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

function fallbackSearch(query = "", filters = {}) {
  const normalizedQuery = query.toLowerCase();
  let results = seedMedia.filter(m => m.title.toLowerCase().includes(normalizedQuery));

  if (filters.type) results = results.filter(m => m.type === filters.type);
  if (filters.year) results = results.filter(m => m.year === Number(filters.year));
  if (filters.genre) results = results.filter(m => m.genres.includes(filters.genre));

  return {
    page: 1,
    total_results: results.length,
    results: results.map(m => ({
      id: m.id,
      media_type: m.type,
      title: m.title,
      name: m.title,
      vote_average: m.score,
      genre_ids: [],
      release_date: `${m.year}-01-01`
    }))
  };
}

function fallbackTrending() {
  return { results: seedMedia.filter(m => m.featured) };
}

function fallbackRecommendations() {
  return { results: seedMedia.filter(m => m.score >= 8.5) };
}

export async function getTrending(type = "all", timeWindow = "day", { ttlMs = DEFAULT_TTL_MS } = {}) {
  if (!hasTmdbAuth()) return fallbackTrending();
  try {
    return await requestWithCache(`trending:${type}:${timeWindow}`, `/trending/${type}/${timeWindow}`, {}, ttlMs);
  } catch {
    return fallbackTrending();
  }
}

export async function searchMulti(query, page = 1, filters = {}, { ttlMs = DEFAULT_TTL_MS } = {}) {
  if (!hasTmdbAuth()) return fallbackSearch(query, filters);
  try {
    const params = { query, page, ...filters };
    // Map a friendly popularity flag to TMDB sort
    if (filters.popularity === "high") {
      params.sort_by = "popularity.desc";
    }
    delete params.popularity;
    return await requestWithCache(
      `search:${query}:${page}:${filters.type ?? ""}:${filters.year ?? ""}:${filters.genre ?? ""}`,
      "/search/multi",
      params,
      ttlMs
    );
  } catch {
    return fallbackSearch(query, filters);
  }
}

export async function getRecommendations({ type = "movie", id } = {}, { ttlMs = DEFAULT_TTL_MS } = {}) {
  if (!hasTmdbAuth()) return fallbackRecommendations();
  const path = id ? `/${type}/${id}/recommendations` : "/trending/all/week";
  const key = id ? `recs:${type}:${id}` : "recs:trending";
  try {
    return await requestWithCache(key, path, {}, ttlMs);
  } catch {
    return fallbackRecommendations();
  }
}

export function computeRuntimeMinutes(items) {
  return items.reduce((total, item) => total + (item.runtime ?? 0), 0);
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

export function getFeatured(timeWindow = "week") {
  return seedMedia.filter(m => m.featured).map(m => ({ ...m, timeWindow }));
}

export function resetInMemoryData() {
  viewedMedia = seedMedia.slice(0, 3);
  watchlist = seedMedia.slice(3);
}

export function resetCache() {
  cache.clear();
  inflight.clear();
  lastRequestAt = 0;
}

export function getProfileStats() {
  const viewed = getViewedMedia();
  const watch = getWatchlist();
  const totalRuntimeMinutes = computeRuntimeMinutes(viewed);
  return {
    totalViewed: viewed.length,
    totalRuntimeMinutes,
    totalRuntimeHours: Math.round((totalRuntimeMinutes / 60) * 10) / 10,
    watchlistCount: watch.length
  };
}