import request from "supertest";
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../src/utils/db.js", () => ({
  getCollection: vi.fn().mockResolvedValue(null)
}));

import app from "../src/app.js";
import { resetInMemoryData, resetCache } from "../src/utils/movieService.js";

beforeEach(() => {
  resetInMemoryData();
  resetCache();
});

describe("GET /home", () => {
  it("returns profile, stats, viewed items, top picks, and watchlist", async () => {
    const res = await request(app).get("/home");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.profile?.name).toBeTypeOf("string");
    expect(res.body.stats.totalViewed).toBeGreaterThan(0);
    expect(res.body.stats.totalRuntimeMinutes).toBeGreaterThan(0);
    expect(Array.isArray(res.body.viewed)).toBe(true);
    expect(Array.isArray(res.body.top)).toBe(true);
    expect(Array.isArray(res.body.watchlist)).toBe(true);
    expect(Array.isArray(res.body.trending)).toBe(true);
  });
});

describe("Home detail endpoints", () => {
  it("returns stats with hours and minutes", async () => {
    const res = await request(app).get("/home/stats");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.stats.totalRuntimeMinutes).toBeGreaterThan(0);
    expect(res.body.stats.totalRuntimeHours).toBeGreaterThan(0);
  });

  it("returns viewed list", async () => {
    const res = await request(app).get("/home/viewed");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.viewed)).toBe(true);
  });

  it("returns watchlist", async () => {
    const res = await request(app).get("/home/watchlist");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.watchlist)).toBe(true);
  });

  it("returns top picks", async () => {
    const res = await request(app).get("/home/top");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.top)).toBe(true);
    expect(res.body.top.length).toBeGreaterThan(0);
  });
});
