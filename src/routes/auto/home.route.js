import { Router } from "express";
import { computeRuntimeMinutes, getTopPicks, getViewedMedia, getWatchlist, getTrending } from "../../utils/movieService.js";
import { getProfile } from "../../utils/profileService.js";

const router = Router();

router.get("/home", async (_req, res, next) => {
  const viewed = getViewedMedia();
  const watchlist = getWatchlist();
  const profile = getProfile();
  try {
    const trending = await getTrending("all", "day");
    res.status(200).json({
      ok: true,
      profile,
      stats: {
        totalViewed: viewed.length,
        totalRuntimeMinutes: computeRuntimeMinutes(viewed)
      },
      viewed,
      top: getTopPicks(3),
      watchlist,
      trending: trending.results ?? []
    });
  } catch (err) {
    next(err);
  }
});

export default router;
