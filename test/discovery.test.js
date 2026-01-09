import request from "supertest";
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../src/utils/db.js", () => ({
  getCollection: vi.fn().mockResolvedValue(null)
}));

import app from "../src/app.js";
import { resetInMemoryData, resetCache, resetSignals } from "../src/utils/movieService.js";

beforeEach(() => {
  process.env.TMDB_API_KEY = "";
  process.env.TMDB_READ_TOKEN = "";
  resetInMemoryData();
  resetCache();
  resetSignals();
});

describe("GET /discovery", () => {
  it("returns recommendations, suggestions, and watchlist", async () => {
    const res = await request(app).get("/discovery");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.recommendations)).toBe(true);
    expect(Array.isArray(res.body.suggestions)).toBe(true);
    expect(Array.isArray(res.body.watchlist)).toBe(true);
  });
});

describe("POST /discovery/watchlist", () => {
  it("adds an item to the watchlist", async () => {
    const res = await request(app).post("/discovery/watchlist").send({ mediaId: 1 });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.watchlist.some(item => item.id === 1)).toBe(true);
  });

  it("validates missing mediaId", async () => {
    const res = await request(app).post("/discovery/watchlist").send({});
    expect(res.status).toBe(400);
  });
});

describe("POST /discovery/like", () => {
  it("registers a like signal", async () => {
    const res = await request(app).post("/discovery/like").send({ mediaId: 1 });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.signals)).toBe(true);
  });

  it("validates missing mediaId", async () => {
    const res = await request(app).post("/discovery/like").send({});
    expect(res.status).toBe(400);
  });
});