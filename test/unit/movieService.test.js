import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  addToWatchlist,
  computeRuntimeMinutes,
  getApiConfig,
  getFeatured,
  getRecommendations,
  getTopPicks,
  getTrending,
  getViewedMedia,
  getWatchlist,
  resetCache,
  resetInMemoryData,
  searchMulti
} from "../../src/utils/movieService.js";

const sampleTrending = { results: [{ id: 101, title: "Sample" }] };
const sampleSearch = { total_results: 1, results: [{ id: 201, media_type: "movie", title: "Sample Search" }] };

beforeEach(() => {
  resetInMemoryData();
  resetCache();
  vi.useRealTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("movieService basics", () => {
  it("returns api config", () => {
    const cfg = getApiConfig();
    expect(cfg).toHaveProperty("apiKey");
    expect(cfg).toHaveProperty("readToken");
  });

  it("computes runtime and top picks", () => {
    const viewed = getViewedMedia();
    expect(computeRuntimeMinutes(viewed)).toBeGreaterThan(0);
    expect(getTopPicks(2).length).toBe(2);
  });

  it("manages watchlist mutations", () => {
    const before = getWatchlist().length;
    const updated = addToWatchlist(1);
    expect(updated.length).toBeGreaterThanOrEqual(before);
    expect(updated.some(item => item.id === 1)).toBe(true);
  });

  it("returns featured", () => {
    expect(getFeatured().length).toBeGreaterThan(0);
  });
});

describe("movieService TMDB calls with cache", () => {
  it("caches trending responses", async () => {
    process.env.TMDB_API_KEY = "test";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(sampleTrending), text: () => Promise.resolve("") })
      .mockResolvedValue({ ok: true, json: () => Promise.resolve(sampleTrending), text: () => Promise.resolve("") });
    vi.stubGlobal("fetch", fetchMock);

    const first = await getTrending("all", "day", { ttlMs: 10_000 });
    const second = await getTrending("all", "day", { ttlMs: 10_000 });
    expect(first.results[0].id).toBe(101);
    expect(fetchMock).toHaveBeenCalledTimes(1); // cached on second call
  });

  it("expires cache after TTL", async () => {
    process.env.TMDB_API_KEY = "test";
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve(sampleTrending), text: () => Promise.resolve("") });
    vi.stubGlobal("fetch", fetchMock);

    await getTrending("all", "day", { ttlMs: 100 });
    vi.advanceTimersByTime(200);
    await getTrending("all", "day", { ttlMs: 100 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("search uses TMDB when available", async () => {
    process.env.TMDB_API_KEY = "test";
    const fetchMock = vi.fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve(sampleSearch), text: () => Promise.resolve("") });
    vi.stubGlobal("fetch", fetchMock);

    const res = await searchMulti("sample", 1, { type: "movie", popularity: "high" });
    expect(res.total_results).toBe(1);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("recommendations fall back to seed on error", async () => {
    process.env.TMDB_API_KEY = "test";
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}), text: () => Promise.resolve("fail") });
    vi.stubGlobal("fetch", fetchMock);

    const res = await getRecommendations();
    expect(Array.isArray(res.results)).toBe(true);
  });
});