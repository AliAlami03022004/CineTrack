/**
 * Movie/series helpers with TMDB v3 support, in-memory cache (TTL),
 * basic request throttling, and fallbacks when TMDB is unavailable.
 */
import dotenv from "dotenv";
import { getCollection } from "./db.js";
dotenv.config();

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MIN_INTERVAL_MS = 150; // simple rate limit between requests

const cache = new Map(); // key -> { expiresAt, data }
const inflight = new Map(); // key -> Promise
let lastRequestAt = 0;
let searchIndexesReady = false;

const seedMedia = [
  { id: 1, title: "Inception", type: "movie", runtime: 148, year: 2010, genres: ["sci-fi", "thriller"], score: 9.0, featured: true },
  { id: 2, title: "The Dark Knight", type: "movie", runtime: 152, year: 2008, genres: ["action", "crime"], score: 9.1, featured: true },
  { id: 3, title: "Breaking Bad", type: "tv", runtime: 50, year: 2008, genres: ["crime", "drama"], score: 9.5, featured: false },
  { id: 4, title: "The Bear", type: "tv", runtime: 32, year: 2022, genres: ["drama"], score: 8.6, featured: true },
  { id: 5, title: "Everything Everywhere All at Once", type: "movie", runtime: 139, year: 2022, genres: ["sci-fi", "adventure"], score: 8.1, featured: false }
];

let viewedMedia = seedMedia.slice(0, 3);
let watchlist = seedMedia.slice(3);
let likedSignals = [];

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

async function ensureSearchIndexes(col) {
  if (!col || searchIndexesReady) return;
  try {
    await col.createIndex({ key: 1 }, { unique: true });
    await col.createIndex({ cachedAt: 1 }, { expireAfterSeconds: 7 * 24 * 3600 });
    searchIndexesReady = true;
    console.info("[db] search cache indexes ensured");
  } catch (err) {
    console.warn("[db] ensureSearchIndexes failed:", err?.message ?? err);
  }
}

function buildSearchKey(query, filters = {}, page = 1) {
  return [
    "q",
    query ?? "",
    "p",
    page,
    "t",
    filters.type ?? "",
    "y",
    filters.year ?? "",
    "g",
    filters.genre ?? "",
    "pop",
    filters.popularity ?? ""
  ].join(":");
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
  const key = buildSearchKey(query, filters, page);
  if (!hasTmdbAuth()) return fallbackSearch(query, filters);
  try {
    const params = { query, page, ...filters };
    if (filters.popularity === "high") params.sort_by = "popularity.desc";
    delete params.popularity;

    const data = await requestWithCache(
      `search:${query}:${page}:${filters.type ?? ""}:${filters.year ?? ""}:${filters.genre ?? ""}`,
      "/search/multi",
      params,
      ttlMs
    );

    const col = await safeGetCollection("searchCache");
    if (col) {
      await ensureSearchIndexes(col);
      await col.updateOne(
        { key },
        {
          $set: {
            key,
            query,
            filters: { ...filters, page },
            data,
            cachedAt: new Date()
          }
        },
        { upsert: true }
      );
      console.info(`[db] search cache upserted for key ${key}`);
    }
    return data;
  } catch (err) {
    console.warn("[db] searchMulti TMDB failed, trying Mongo cache:", err?.message ?? err);
    try {
      const col = await safeGetCollection("searchCache");
      if (col) {
        const cached = await col.findOne({ key });
        if (cached?.data) {
          console.info(`[db] search cache hit for key ${key}`);
          return cached.data;
        }
      }
    } catch (dbErr) {
      console.warn("[db] search cache lookup failed:", dbErr?.message ?? dbErr);
    }
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

async function getTmdbDetails(itemId, type) {
  if (!hasTmdbAuth() || !itemId || !type) return null;
  try {
    return await requestWithCache(`details:${type}:${itemId}`, `/${type}/${itemId}`, {}, 24 * 60 * 60 * 1000);
  } catch {
    return null;
  }
}

async function getTmdbSearchMatch(title, type) {
  if (!hasTmdbAuth() || !title) return null;
  try {
    const data = await requestWithCache(`search-title:${type}:${title}`, "/search/multi", { query: title }, 24 * 60 * 60 * 1000);
    const results = data?.results ?? [];
    return results.find(r => r.media_type === type) || results[0] || null;
  } catch {
    return null;
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

export function removeFromWatchlist(mediaId) {
  watchlist = watchlist.filter(m => m.id !== mediaId);
  return watchlist;
}

export function getTopPicks(limit = 3, items = viewedMedia) {
  const list = [...(items ?? [])];
  const hasScore = list.some(item => item.score || item.vote_average);
  if (hasScore) {
    list.sort((a, b) => (b.score ?? b.vote_average ?? 0) - (a.score ?? a.vote_average ?? 0));
  }
  return list.slice(0, limit);
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

export function resetSignals() {
  likedSignals = [];
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

async function safeGetCollection(name) {
  try {
    const col = await getCollection(name);
    if (!col) {
      console.warn(`[db] collection ${name} unavailable (no uri or connection); falling back to memory`);
    }
    return col;
  } catch (err) {
    console.warn(`[db] failed to get collection ${name}:`, err?.message ?? err);
    return null;
  }
}

async function enrichSeedItems(items) {
  if (!items?.length || !hasTmdbAuth()) return items ?? [];
  return Promise.all(items.map(async (item) => {
    if (item.poster_path || item.posterPath) return item;
    const match = await getTmdbSearchMatch(item.title, item.type);
    if (!match) return item;
    const posterPath = match.poster_path || match.backdrop_path;
    if (posterPath) {
      item.poster_path = posterPath;
    }
    if (match.release_date && !item.release_date) item.release_date = match.release_date;
    if (match.first_air_date && !item.first_air_date) item.first_air_date = match.first_air_date;
    return item;
  }));
}

async function enrichDocsWithPosters(docs, col) {
  if (!docs.length || !hasTmdbAuth()) return docs;
  const updates = [];
  const enriched = await Promise.all(docs.map(async (doc) => {
    const type = doc.type || doc.media_type;
    if (!type || !doc.itemId) return doc;
    const missingPoster = !(doc.posterPath || doc.poster_path || doc.backdropPath || doc.backdrop_path);
    const missingTitle = !doc.title || doc.title === "Unknown";
    if (!missingPoster && !missingTitle) return doc;
    const searchMatch = doc.title ? await getTmdbSearchMatch(doc.title, type) : null;
    const details = searchMatch ? null : await getTmdbDetails(doc.itemId, type);
    const source = searchMatch || details;
    if (!source) return doc;
    const posterPath = source.poster_path || source.backdrop_path || doc.posterPath || doc.backdropPath || null;
    const title = missingTitle ? (source.title || source.name || doc.title) : doc.title;
    const update = {};
    if (posterPath) update.posterPath = posterPath;
    if (title) update.title = title;
    if (Object.keys(update).length && col) {
      updates.push(col.updateOne({ itemId: doc.itemId, userId: doc.userId }, { $set: update }));
    }
    return { ...doc, ...update };
  }));
  if (updates.length) {
    Promise.allSettled(updates).catch(() => {});
  }
  return enriched;
}


export async function getViewedMediaFromDb(userId = "demo-user") {
  try {
    const col = await safeGetCollection("viewed");
    if (!col) return getViewedMedia();
    const docs = await col.find({ userId }).sort({ viewedAt: -1 }).toArray();
    console.info(`[db] getViewedMediaFromDb returned ${docs.length} docs for ${userId}`);
    const enriched = await enrichDocsWithPosters(docs, col);
    if (enriched.length) return enriched;
    return await enrichSeedItems(getViewedMedia());
  } catch (err) {
    console.warn("[db] getViewedMediaFromDb fallback:", err?.message ?? err);
    return await enrichSeedItems(getViewedMedia());
  }
}

export async function getWatchlistFromDb(userId = "demo-user") {
  try {
    const col = await safeGetCollection("watchlist");
    if (!col) return getWatchlist();
    const docs = await col.find({ userId }).sort({ addedAt: -1 }).toArray();
    console.info(`[db] getWatchlistFromDb returned ${docs.length} docs for ${userId}`);
    return await enrichDocsWithPosters(docs, col);
  } catch (err) {
    console.warn("[db] getWatchlistFromDb fallback:", err?.message ?? err);
    return getWatchlist();
  }
}

export async function markAsViewedDb(media, userId = "demo-user") {
  try {
    const col = await safeGetCollection("viewed");
    if (!col) return getViewedMedia();
    const itemId = media?.id ?? media?.itemId ?? media;
    const seed = seedMedia.find(m => m.id === itemId);
    const doc = {
      userId,
      itemId,
      type: media.type ?? seed?.type ?? null,
      title: media.title ?? seed?.title ?? "Unknown",
      runtime: media.runtime ?? seed?.runtime ?? null,
      viewedAt: new Date()
    };
    await col.updateOne({ userId, itemId }, { $set: doc }, { upsert: true });
    console.info(`[db] markAsViewedDb upserted item ${itemId} for ${userId}`);
    return getViewedMediaFromDb(userId);
  } catch (err) {
    console.warn("[db] markAsViewedDb fallback:", err?.message ?? err);
    return getViewedMedia();
  }
}

export async function addToWatchlistDb(media, userId = "demo-user") {
  try {
    const col = await safeGetCollection("watchlist");
    const itemId = media?.id ?? media?.itemId ?? media;
    const seed = seedMedia.find(m => m.id === itemId);
    if (!col) return addToWatchlist(itemId);
    const doc = {
      userId,
      itemId,
      type: media.type ?? media.media_type ?? seed?.type ?? null,
      title: media.title ?? media.name ?? seed?.title ?? "Unknown",
      runtime: media.runtime ?? seed?.runtime ?? null,
      posterPath: media.poster_path ?? media.posterPath ?? null,
      backdropPath: media.backdrop_path ?? media.backdropPath ?? null,
      addedAt: new Date()
    };
    await col.updateOne({ userId, itemId }, { $set: doc }, { upsert: true });
    console.info(`[db] addToWatchlistDb upserted item ${itemId} for ${userId}`);
    return getWatchlistFromDb(userId);
  } catch (err) {
    console.warn("[db] addToWatchlistDb fallback:", err?.message ?? err);
    return addToWatchlist(media?.id ?? media?.itemId ?? media);
  }
}

export async function removeFromWatchlistDb(mediaId, userId = "demo-user") {
  try {
    const col = await safeGetCollection("watchlist");
    if (!col) return removeFromWatchlist(mediaId);
    await col.deleteOne({ userId, itemId: mediaId });
    console.info(`[db] removeFromWatchlistDb removed item ${mediaId} for ${userId}`);
    return getWatchlistFromDb(userId);
  } catch (err) {
    console.warn("[db] removeFromWatchlistDb fallback:", err?.message ?? err);
    return removeFromWatchlist(mediaId);
  }
}

export async function getProfileStatsFromDb(userId = "demo-user") {
  try {
    const viewed = await getViewedMediaFromDb(userId);
    const watch = await getWatchlistFromDb(userId);
    const totalRuntimeMinutes = computeRuntimeMinutes(viewed);
    return {
      totalViewed: viewed.length,
      totalRuntimeMinutes,
      totalRuntimeHours: Math.round((totalRuntimeMinutes / 60) * 10) / 10,
      watchlistCount: watch.length
    };
  } catch (err) {
    console.warn("[db] getProfileStatsFromDb fallback:", err?.message ?? err);
    return getProfileStats();
  }
}

export async function getRecentSignalsFromDb(userId = "demo-user", limit = 20) {
  try {
    const col = await safeGetCollection("signals");
    if (!col) return likedSignals;
    const docs = await col.find({ userId }).sort({ likedAt: -1, viewedAt: -1 }).limit(limit).toArray();
    console.info(`[db] getRecentSignalsFromDb returned ${docs.length} docs for ${userId}`);
    return docs;
  } catch (err) {
    console.warn("[db] getRecentSignalsFromDb fallback:", err?.message ?? err);
    return likedSignals;
  }
}

export async function likeMediaDb(media, userId = "demo-user") {
  try {
    const col = await safeGetCollection("signals");
    const itemId = media?.id ?? media?.itemId ?? media;
    const seed = seedMedia.find(m => m.id === itemId);
    const doc = {
      userId,
      itemId,
      type: media.type ?? media.media_type ?? seed?.type ?? null,
      title: media.title ?? media.name ?? seed?.title ?? "Unknown",
      runtime: media.runtime ?? seed?.runtime ?? null,
      posterPath: media.poster_path ?? media.posterPath ?? null,
      backdropPath: media.backdrop_path ?? media.backdropPath ?? null,
      liked: true,
      likedAt: new Date()
    };
    if (!col) {
      likedSignals = [{ ...doc }, ...likedSignals.filter(s => s.itemId !== itemId)];
      return likedSignals;
    }
    await col.updateOne({ userId, itemId }, { $set: doc }, { upsert: true });
    console.info(`[db] likeMediaDb upserted item ${itemId} for ${userId}`);
    return getRecentSignalsFromDb(userId);
  } catch (err) {
    console.warn("[db] likeMediaDb fallback:", err?.message ?? err);
    return likedSignals;
  }
}

export async function getPersonalizedRecommendations(userId = "demo-user", category = "all") {
  try {
    const base = await getRecommendations({ type: category === "tv" ? "tv" : "movie" });
    const signals = await getRecentSignalsFromDb(userId, 50);
    const baseMap = new Map((base.results ?? []).filter(item => item?.id).map(item => [item.id, item]));
    const col = await safeGetCollection("signals");
    const updates = [];
    const signalItems = signals.map(sig => {
      const baseItem = baseMap.get(sig.itemId);
      const title = sig.title && sig.title !== "Unknown" ? sig.title : (baseItem?.title || baseItem?.name || sig.title);
      const type = sig.type || baseItem?.media_type || baseItem?.type || null;
      const runtime = sig.runtime ?? baseItem?.runtime ?? null;
      const posterPath = sig.posterPath || sig.poster_path || baseItem?.poster_path || baseItem?.backdrop_path || null;
      if (col && baseItem && (sig.title === "Unknown" || !sig.title || !sig.type)) {
        updates.push(col.updateOne(
          { userId, itemId: sig.itemId },
          { $set: { title: title ?? "Unknown", type, runtime, posterPath } }
        ));
      }
      return {
        id: sig.itemId,
        media_type: type,
        title,
        name: title,
        runtime,
        poster_path: posterPath,
        score: 10,
        fromSignals: true
      };
    }).filter(item => item.title && item.title !== "Unknown");
    if (updates.length) {
      Promise.allSettled(updates).catch(() => {});
    }
    const seen = new Set(signalItems.map(s => s.id));
    const combined = [...signalItems];
    for (const item of base.results ?? []) {
      if (item?.id && !seen.has(item.id)) {
        seen.add(item.id);
        combined.push(item);
      }
    }
    console.info(`[db] personalized recommendations built with ${signals.length} signals`);
    return { results: combined };
  } catch (err) {
    console.warn("[db] getPersonalizedRecommendations fallback:", err?.message ?? err);
    return getRecommendations({ type: category === "tv" ? "tv" : "movie" });
  }
}
