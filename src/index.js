/**
 * App entrypoint.
 * We keep the HTTP listener separate from the Express app instance so
 * tests can import `app` without opening a real port.
 */
import app from "./app.js";

import dotenv from "dotenv";
dotenv.config();   // ← OBLIGATOIRE pour charger .env

console.log("TMDB KEY =", process.env.TMDB_API_KEY);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
