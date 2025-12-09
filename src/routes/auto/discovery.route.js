import { Router } from "express";
import { getRecommendations, getWatchlist } from "../../utils/movieService.js";

const router = Router();

router.get("/discovery", async (_req, res, next) => {
  try {
    const recommendations = await getRecommendations();
    res.status(200).json({
      ok: true,
      recommendations: recommendations.results ?? [],
      watchlist: getWatchlist()
    });
  } catch (err) {
    next(err);
  }
});

export default router;
