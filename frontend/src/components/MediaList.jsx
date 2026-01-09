import { getPosterUrl, getTitle, getType, getYear } from "../utils/media.js";

export default function MediaList({ items = [], onRemove }) {
  if (!items.length) return <div className="muted">No items</div>;
  return (
    <div className="media-grid">
      {items.map(item => (
        <article key={item.id ?? item.itemId ?? item.title} className="media-card">
          <div className="poster">
            {getPosterUrl(item) ? (
              <img
                src={getPosterUrl(item)}
                alt={getTitle(item)}
                loading="lazy"
              />
            ) : (
              <div className="poster-fallback">{getTitle(item).slice(0, 1)}</div>
            )}
          </div>
          <div className="media-content">
            <div className="media-title">{getTitle(item)}</div>
            <div className="media-meta">
              <span className="pill">{getType(item)}</span>
              {getYear(item) && <span className="pill">{getYear(item)}</span>}
              {item.runtime && <span className="pill">{item.runtime} min</span>}
              {item.vote_average && <span className="pill">★ {Number(item.vote_average).toFixed(1)}</span>}
            </div>
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
