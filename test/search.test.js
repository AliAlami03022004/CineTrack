import request from "supertest";
import { describe, it, expect, beforeEach } from "vitest";
import app from "../src/app.js";
import { resetInMemoryData, resetCache } from "../src/utils/movieService.js";

beforeEach(() => {
  resetInMemoryData();
  resetCache();
});

describe("GET /search", () => {
  it("returns results and featured items", async () => {
    const res = await request(app).get("/search").query({ query: "the", type: "movie" });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.query).toBe("the");
    expect(res.body.results.length).toBeGreaterThan(0);
    expect(Array.isArray(res.body.featured)).toBe(true);
    expect(Array.isArray(res.body.suggestions)).toBe(true);
  });
});

describe("POST /search/watchlist", () => {
  it("adds an item to the watchlist", async () => {
    const res = await request(app).post("/search/watchlist").send({ mediaId: 1 });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.watchlist.some(item => item.id === 1)).toBe(true);
  });

  it("validates missing mediaId", async () => {
    const res = await request(app).post("/search/watchlist").send({});
    expect(res.status).toBe(400);
  });
});