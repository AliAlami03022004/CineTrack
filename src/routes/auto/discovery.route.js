import { Router } from "express";
import { addToWatchlist, addToWatchlistDb, getRecommendations, getTrending, getWatchlist, getWatchlistFromDb } from "../../utils/movieService.js";

const router = Router();

router.get("/discovery", async (req, res, next) => {
  try {
    const { category = "all" } = req.query;
    const recommendations = await getRecommendations({ type: category === "tv" ? "tv" : "movie" });
    const suggestions = await getTrending(category === "tv" ? "tv" : "all", "week");
    res.status(200).json({
      ok: true,
      category,
      recommendations: recommendations.results ?? [],
      suggestions: suggestions.results ?? [],
      watchlist: await getWatchlistFromDb()
    });
  } catch (err) {
    next(err);
  }
});

router.post("/discovery/watchlist", (req, res) => {
  const mediaId = Number(req.body?.mediaId);
  if (!mediaId) return res.status(400).json({ ok: false, message: "mediaId is required" });
  addToWatchlistDb({ id: mediaId })
    .then(watchlist => res.status(201).json({ ok: true, watchlist }))
    .catch(() => {
      const watchlist = addToWatchlist(mediaId);
      res.status(201).json({ ok: true, watchlist });
    });
});

export default router;
