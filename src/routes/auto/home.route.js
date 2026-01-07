import { Router } from "express";
import { computeRuntimeMinutes, getProfileStats, getTopPicks, getViewedMedia, getWatchlist, getTrending } from "../../utils/movieService.js";
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

router.get("/home/stats", (_req, res) => {
  res.status(200).json({ ok: true, profile: getProfile(), stats: getProfileStats() });
});

router.get("/home/viewed", (_req, res) => {
  res.status(200).json({ ok: true, viewed: getViewedMedia() });
});

router.get("/home/watchlist", (_req, res) => {
  res.status(200).json({ ok: true, watchlist: getWatchlist() });
});

router.get("/home/top", (_req, res) => {
  res.status(200).json({ ok: true, top: getTopPicks(3) });
});

export default router;
