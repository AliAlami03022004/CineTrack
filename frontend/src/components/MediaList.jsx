export default function MediaList({ items = [], onRemove }) {
  if (!items.length) return <div className="muted">No items</div>;
  return (
    <div className="media-grid">
      {items.map(item => (
        <article key={item.id ?? item.itemId ?? item.title} className="media-card">
          <div className="media-title">{item.title || item.name}</div>
          <div className="media-meta">
            <span className="pill">{item.type || item.media_type || "?"}</span>
            {item.year && <span className="pill">{item.year}</span>}
            {item.runtime && <span className="pill">{item.runtime} min</span>}
            {item.vote_average && <span className="pill">★ {item.vote_average}</span>}
          </div>
          {onRemove && (
            <div className="actions-row">
              <button className="btn ghost" onClick={() => onRemove(item)}>Remove</button>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
