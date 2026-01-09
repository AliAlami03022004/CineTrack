import { Router } from "express";
import {
  getProfileStatsFromDb,
  getTopPicks,
  getViewedMedia,
  getViewedMediaFromDb,
  getWatchlist,
  getWatchlistFromDb,
  getTrending
} from "../../utils/movieService.js";
import { getProfile } from "../../utils/profileService.js";

const router = Router();

router.get("/home", async (_req, res, next) => {
  try {
    const [viewed, watchlist] = await Promise.all([
      getViewedMediaFromDb(),
      getWatchlistFromDb()
    ]);
    const profile = getProfile();
    const stats = await getProfileStatsFromDb();
    const trending = await getTrending("all", "day");
    res.status(200).json({
      ok: true,
      profile,
      stats,
      viewed,
      top: getTopPicks(3, viewed),
      watchlist,
      trending: trending.results ?? []
    });
  } catch (err) {
    next(err);
  }
});

router.get("/home/stats", async (_req, res, next) => {
  try {
    const stats = await getProfileStatsFromDb();
    res.status(200).json({ ok: true, profile: getProfile(), stats });
  } catch (err) {
    next(err);
  }
});

router.get("/home/viewed", async (_req, res, next) => {
  try {
    const viewed = await getViewedMediaFromDb();
    res.status(200).json({ ok: true, viewed });
  } catch (err) {
    next(err);
  }
});

router.get("/home/watchlist", async (_req, res, next) => {
  try {
    const watchlist = await getWatchlistFromDb();
    res.status(200).json({ ok: true, watchlist });
  } catch (err) {
    next(err);
  }
});

router.get("/home/top", (_req, res) => {
  res.status(200).json({ ok: true, top: getTopPicks(3) });
});

export default router;
