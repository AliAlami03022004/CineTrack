import { Router } from "express";
import { addToWatchlist, addToWatchlistDb, getFeatured, getTrending, searchMulti } from "../../utils/movieService.js";

const router = Router();

router.get("/search", async (req, res, next) => {
  const { query = "", page = "1", type, year, genre, popularity } = req.query;
  const filters = { type, year, genre, popularity };
  const pageNumber = Number(page) || 1;
  try {
    const results = await searchMulti(query, pageNumber, filters);
    const suggestions = await getTrending("all", "week");
    res.status(200).json({
      ok: true,
      query,
      page: pageNumber,
      totalResults: results.total_results ?? 0,
      results: results.results ?? [],
      featured: getFeatured(),
      suggestions: suggestions.results ?? []
    });
  } catch (err) {
    next(err);
  }
});

router.post("/search/watchlist", async (req, res, next) => {
  const mediaId = Number(req.body?.mediaId);
  if (!mediaId) return res.status(400).json({ ok: false, message: "mediaId is required" });
  try {
    const watchlist = await addToWatchlistDb({ id: mediaId });
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

export default router;
