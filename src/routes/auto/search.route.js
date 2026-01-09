import { Router } from "express";
import { addToWatchlist, addToWatchlistDb, getFeatured, getTrending, removeFromWatchlist, removeFromWatchlistDb, searchMulti } from "../../utils/movieService.js";

const router = Router();

router.get("/search", async (req, res, next) => {
  const { query = "", page = "1", type, year, genre, popularity } = req.query;
  const filters = { type, year, genre, popularity };
  const pageNumber = Number(page) || 1;
  try {
    const results = await searchMulti(query, pageNumber, filters);
    // Local filter to respect type/year when TMDB search/multi returns mixed media
    const filtered = (results.results ?? []).filter(item => {
      const okType = !type || (item.media_type || item.type) === type;
      const okYear = !year || (item.release_date || item.first_air_date || "").startsWith(String(year));
      return okType && okYear;
    });
    const suggestions = await getTrending("all", "week");
    res.status(200).json({
      ok: true,
      query,
      page: pageNumber,
      totalResults: filtered.length ?? results.total_results ?? 0,
      results: filtered,
      featured: getFeatured(),
      suggestions: suggestions.results ?? []
    });
  } catch (err) {
    next(err);
  }
});

router.post("/search/watchlist", async (req, res, next) => {
  const media = req.body?.media ?? {};
  const mediaId = Number(req.body?.mediaId ?? media?.id);
  if (!mediaId) return res.status(400).json({ ok: false, message: "mediaId is required" });
  try {
    const watchlist = await addToWatchlistDb({ ...media, id: mediaId });
    res.status(201).json({ ok: true, watchlist });
  } catch (err) {
    // fallback in service already, but keep defensive
    try {
      const watchlist = addToWatchlist(mediaId);
      res.status(201).json({ ok: true, watchlist });
    } catch (inner) {
      next(inner ?? err);
    }
  }
});

router.delete("/search/watchlist", async (req, res, next) => {
  const mediaId = Number(req.body?.mediaId);
  if (!mediaId) return res.status(400).json({ ok: false, message: "mediaId is required" });
  try {
    const watchlist = await removeFromWatchlistDb(mediaId);
    res.status(200).json({ ok: true, watchlist });
  } catch (err) {
    try {
      const watchlist = removeFromWatchlist(mediaId);
      res.status(200).json({ ok: true, watchlist });
    } catch (inner) {
      next(inner ?? err);
    }
  }
});

export default router;
