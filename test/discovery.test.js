import request from "supertest";
import { describe, it, expect, beforeEach } from "vitest";
import app from "../src/app.js";
import { resetInMemoryData, resetCache } from "../src/utils/movieService.js";

beforeEach(() => {
  resetInMemoryData();
  resetCache();
});

describe("GET /discovery", () => {
  it("returns recommendations and watchlist", async () => {
    const res = await request(app).get("/discovery");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.recommendations)).toBe(true);
    expect(Array.isArray(res.body.watchlist)).toBe(true);
  });
});
