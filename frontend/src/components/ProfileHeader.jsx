export default function ProfileHeader({ profile, stats }) {
  if (!profile) return null;
  return (
    <div className="profile-header">
      <div className="banner" style={{ backgroundImage: `url(${profile.bannerUrl})` }} />
      <div className="profile-meta">
        <img className="avatar" src={profile.avatarUrl} alt={profile.name} />
        <div>
          <h1>{profile.name}</h1>
          {profile.bio ? <p className="bio">{profile.bio}</p> : null}
          <div className="stats">
            <Stat label="Total viewed" value={stats?.totalViewed ?? 0} />
            <Stat label="Total time (h)" value={stats?.totalRuntimeHours ?? 0} />
            <Stat label="Watchlist" value={stats?.watchlistCount ?? 0} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
