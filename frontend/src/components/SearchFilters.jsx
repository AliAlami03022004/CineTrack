const GENRES = [
  { value: "", label: "All genres" },
  { value: "action", label: "Action" },
  { value: "drama", label: "Drama" },
  { value: "comedy", label: "Comedy" },
  { value: "sci-fi", label: "Sci-Fi" },
  { value: "crime", label: "Crime" }
];

export default function SearchFilters({ type, year, genre, popularity, onChange }) {
  return (
    <div className="filters">
      <select value={type} onChange={e => onChange({ type: e.target.value })}>
        <option value="">All types</option>
        <option value="movie">Movie</option>
        <option value="tv">TV</option>
      </select>
      <input
        type="number"
        placeholder="Year"
        value={year}
        onChange={e => onChange({ year: e.target.value })}
      />
      <select value={genre} onChange={e => onChange({ genre: e.target.value })}>
        {GENRES.map(g => (
          <option key={g.value} value={g.value}>{g.label}</option>
        ))}
      </select>
      <select value={popularity} onChange={e => onChange({ popularity: e.target.value })}>
        <option value="">Default sort</option>
        <option value="high">Popularity</option>
      </select>
    </div>
  );
}
