export default function SearchBar({ query, onChange, onSubmit }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.();
  };
  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <input
        className="input"
        type="text"
        placeholder="Search for a movie or TV show..."
        value={query}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="submit" className="btn">Search</button>
    </form>
  );
}
