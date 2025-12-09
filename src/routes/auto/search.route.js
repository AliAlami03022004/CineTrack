import { Router } from "express";
import { addToWatchlist, getFeatured, searchMedia } from "../../utils/movieService.js";

const router = Router();

router.get("/search", (req, res) => {
  const { query = "", page = "1", type, year, genre } = req.query;
  const filters = { type, year, genre };
  const pageNumber = Number(page) || 1;
  const results = searchMedia(query, filters, pageNumber);
  res.status(200).json({ ok: true, ...results, featured: getFeatured() });
});

router.post("/search/watchlist", (req, res) => {
  const mediaId = Number(req.body?.mediaId);
  if (!mediaId) return res.status(400).json({ ok: false, message: "mediaId is required" });
  const watchlist = addToWatchlist(mediaId);
  res.status(201).json({ ok: true, watchlist });
});

export default router;
