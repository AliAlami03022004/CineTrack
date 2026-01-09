export default function SearchResults({ results = [], onAdd, onRemove }) {
  if (!results.length) return <div className="muted">No results</div>;
  return (
    <div className="media-grid">
      {results.map(item => (
        <article key={item.id} className="media-card">
          <div className="media-title">{item.title || item.name}</div>
          <div className="media-meta">
            <span className="pill">{item.media_type || item.type || "?"}</span>
            {item.release_date && <span className="pill">{(item.release_date || "").slice(0, 4)}</span>}
            {item.vote_average && <span className="pill">★ {item.vote_average.toFixed(1)}</span>}
          </div>
          <div className="actions-row">
            <button className="btn ghost" onClick={() => onAdd?.(item)}>+ Watchlist</button>
            <button className="btn ghost" onClick={() => onRemove?.(item)}>Remove</button>
          </div>
        </article>
      ))}
    </div>
  );
}
