import { Router } from "express";
import { getRecommendations, getWatchlist } from "../../utils/movieService.js";

const router = Router();

router.get("/discovery", (_req, res) => {
  res.status(200).json({
    ok: true,
    recommendations: getRecommendations(),
    watchlist: getWatchlist()
  });
});

export default router;
