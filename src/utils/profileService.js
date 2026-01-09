/**
 * Stubbed profile helper for Phase 0.
 * Later phases should hydrate this from a real user store.
 */
export function getProfile() {
  return {
    userId: "demo-user",
    name: process.env.PROFILE_NAME ?? "CineTrack",
    avatarUrl: process.env.PROFILE_AVATAR_URL ?? "https://placehold.co/96x96",
    bannerUrl: process.env.PROFILE_BANNER_URL ?? "https://placehold.co/1200x240",
    bio: process.env.PROFILE_BIO ?? "",
    timezone: "Europe/Paris"
  };
}
