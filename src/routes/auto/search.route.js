import { Router } from "express";
import { addToWatchlist, getFeatured, getTrending, searchMulti } from "../../utils/movieService.js";

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

router.post("/search/watchlist", (req, res) => {
  const mediaId = Number(req.body?.mediaId);
  if (!mediaId) return res.status(400).json({ ok: false, message: "mediaId is required" });
  const watchlist = addToWatchlist(mediaId);
  res.status(201).json({ ok: true, watchlist });
});

export default router;