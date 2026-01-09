const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export function getPosterUrl(item, size = "w342") {
  const path =
    item?.poster_path ||
    item?.posterPath ||
    item?.backdrop_path ||
    item?.backdropPath ||
    item?.posterUrl ||
    item?.image;
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function getTitle(item) {
  return item?.title || item?.name || "Unknown";
}

export function getYear(item) {
  return (
    item?.release_date?.slice(0, 4) ||
    item?.first_air_date?.slice(0, 4) ||
    item?.year ||
    ""
  );
}

export function getType(item) {
  return item?.media_type || item?.type || "?";
}
