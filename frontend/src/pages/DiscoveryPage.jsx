import { useEffect, useState } from "react";
import { getDiscovery, postDiscoveryLike } from "../api/client.js";
import SectionCard from "../components/SectionCard.jsx";
import MediaList from "../components/MediaList.jsx";

export default function DiscoveryPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [likedIds, setLikedIds] = useState(new Set());
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      setMessage("");
      const res = await getDiscovery();
      setData(res);
    } catch (err) {
      setError(err?.message ?? "Failed to load discovery");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleLike = async (item) => {
    try {
      await postDiscoveryLike(item);
      setLikedIds(prev => new Set(prev).add(item.id));
      setMessage("Liked");
      // Optionally refresh recommendations
      load();
    } catch (err) {
      setMessage(err?.message ?? "Failed to like");
    }
  };

  if (loading) return <div className="muted">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!data) return null;

  const recommendations = data.recommendations || [];
  const trending = data.suggestions || [];
  const watchlist = data.watchlist || [];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Discovery</h1>
        {message && <span className="pill">{message}</span>}
      </div>

      <SectionCard title="Recommended for you">
        <div className="media-grid">
          {recommendations.map(item => (
            <article key={item.id} className="media-card">
              <div className="media-title">{item.title || item.name}</div>
              <div className="media-meta">
                <span className="pill">{item.media_type || item.type || "?"}</span>
                {item.release_date && <span className="pill">{(item.release_date || "").slice(0, 4)}</span>}
                {item.vote_average && <span className="pill">★ {item.vote_average.toFixed(1)}</span>}
              </div>
              <div className="actions-row">
                <button
                  className="btn ghost"
                  onClick={() => handleLike(item)}
                  disabled={likedIds.has(item.id)}
                >
                  {likedIds.has(item.id) ? "Liked ♥" : "Like ♥"}
                </button>
              </div>
            </article>
          ))}
          {!recommendations.length && <div className="muted">No recommendations</div>}
        </div>
      </SectionCard>

      <SectionCard title="Trending">
        <MediaList items={trending} />
      </SectionCard>

      <SectionCard title="Your watchlist">
        <MediaList items={watchlist.slice(0, 5)} />
      </SectionCard>
    </div>
  );
}
