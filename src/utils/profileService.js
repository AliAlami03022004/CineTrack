/**
 * Stubbed profile helper for Phase 0.
 * Later phases should hydrate this from a real user store.
 */
export function getProfile() {
  return {
    userId: "demo-user",
    name: "CineTrack Demo",
    avatarUrl: "https://placehold.co/64x64",
    bannerUrl: "https://placehold.co/1200x240",
    bio: "Watchlist + recommandations personnelles",
    timezone: "Europe/Paris"
  };
}
