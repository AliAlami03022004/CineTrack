import { useEffect, useState } from "react";
import { getHome, deleteSearchWatchlist } from "../api/client.js";
import ProfileHeader from "../components/ProfileHeader.jsx";
import SectionCard from "../components/SectionCard.jsx";
import MediaList from "../components/MediaList.jsx";

export default function HomePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getHome();
      setData(res);
    } catch (err) {
      setError(err?.message ?? "Failed to load home");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="muted">Loading home...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!data) return null;

  const stats = {
    totalViewed: data.stats?.totalViewed ?? data.viewed?.length ?? 0,
    totalRuntimeMinutes: data.stats?.totalRuntimeMinutes ?? 0,
    totalRuntimeHours: data.stats?.totalRuntimeHours
      ?? Math.round(((data.stats?.totalRuntimeMinutes ?? 0) / 60) * 10) / 10,
    watchlistCount: data.stats?.watchlistCount ?? data.watchlist?.length ?? 0
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Home</h1>
        <button className="btn" onClick={load}>Refresh</button>
      </div>
      <ProfileHeader profile={data.profile} stats={stats} />
      <SectionCard title="Recently viewed">
        <MediaList items={data.viewed || []} />
      </SectionCard>
      <SectionCard title="Top 3">
        <MediaList items={data.top || []} />
      </SectionCard>
      <SectionCard title="Watchlist">
        <MediaList
          items={data.watchlist || []}
          onRemove={async (item) => {
            await deleteSearchWatchlist({ id: item.id ?? item.itemId });
            load();
          }}
        />
      </SectionCard>
      <SectionCard title="Trending">
        <MediaList items={data.trending || []} />
      </SectionCard>
    </div>
  );
}
