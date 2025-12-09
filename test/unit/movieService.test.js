import { describe, it, expect, beforeEach } from "vitest";
import {
  addToWatchlist,
  computeRuntimeMinutes,
  getApiConfig,
  getFeatured,
  getRecommendations,
  getTopPicks,
  getViewedMedia,
  getWatchlist,
  resetInMemoryData,
  searchMedia
} from "../../src/utils/movieService.js";

beforeEach(() => {
  resetInMemoryData();
});

describe("movieService", () => {
  it("returns api config with placeholder when missing", () => {
    const cfg = getApiConfig();
    expect(cfg).toHaveProperty("apiKey");
  });

  it("computes runtime and top picks", () => {
    const viewed = getViewedMedia();
    expect(computeRuntimeMinutes(viewed)).toBeGreaterThan(0);
    expect(getTopPicks(2).length).toBe(2);
  });

  it("searches by query and filters", () => {
    const result = searchMedia("the", { type: "movie" }, 1);
    expect(result.results.every(r => r.type === "movie")).toBe(true);
    expect(result.page).toBe(1);
  });

  it("manages watchlist mutations", () => {
    const before = getWatchlist().length;
    const updated = addToWatchlist(1);
    expect(updated.length).toBeGreaterThanOrEqual(before);
    expect(updated.some(item => item.id === 1)).toBe(true);
  });

  it("returns featured and recommendations", () => {
    expect(getFeatured().length).toBeGreaterThan(0);
    expect(getRecommendations().length).toBeGreaterThan(0);
  });
});
