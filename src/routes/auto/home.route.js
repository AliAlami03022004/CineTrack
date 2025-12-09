import { Router } from "express";
import { computeRuntimeMinutes, getTopPicks, getViewedMedia, getWatchlist } from "../../utils/movieService.js";
import { getProfile } from "../../utils/profileService.js";

const router = Router();

router.get("/home", (_req, res) => {
  const viewed = getViewedMedia();
  const watchlist = getWatchlist();
  const profile = getProfile();

  res.status(200).json({
    ok: true,
    profile,
    stats: {
      totalViewed: viewed.length,
      totalRuntimeMinutes: computeRuntimeMinutes(viewed)
    },
    viewed,
    top: getTopPicks(3),
    watchlist
  });
});

export default router;
