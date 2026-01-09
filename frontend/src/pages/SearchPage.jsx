import { useEffect, useMemo, useState } from "react";
import { getSearch, postSearchWatchlist, deleteSearchWatchlist } from "../api/client.js";
import SearchBar from "../components/SearchBar.jsx";
import SearchFilters from "../components/SearchFilters.jsx";
import SearchResults from "../components/SearchResults.jsx";
import SectionCard from "../components/SectionCard.jsx";
import MediaList from "../components/MediaList.jsx";
import { useSearchParams } from "react-router-dom";

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("query") || "");
  const [type, setType] = useState(params.get("type") || "");
  const [year, setYear] = useState(params.get("year") || "");
  const [genre, setGenre] = useState(params.get("genre") || "");
  const [popularity, setPopularity] = useState(params.get("popularity") || "");
  const [page, setPage] = useState(Number(params.get("page")) || 1);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");

  const filters = useMemo(() => ({ type, year, genre, popularity }), [type, year, genre, popularity]);

  const syncUrl = () => {
    const next = new URLSearchParams();
    if (query) next.set("query", query);
    if (type) next.set("type", type);
    if (year) next.set("year", year);
    if (genre) next.set("genre", genre);
    if (popularity) next.set("popularity", popularity);
    if (page !== 1) next.set("page", String(page));
    setParams(next);
  };

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      setMessage("");
      syncUrl();
      const res = await getSearch({ query, page, type, year, genre, popularity });
      setData(res);
    } catch (err) {
      setError(err?.message ?? "Failed to search");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (partial) => {
    if (partial.type !== undefined) setType(partial.type);
    if (partial.year !== undefined) setYear(partial.year);
    if (partial.genre !== undefined) setGenre(partial.genre);
    if (partial.popularity !== undefined) setPopularity(partial.popularity);
    setPage(1);
  };

  const handleAdd = async (media) => {
    try {
      await postSearchWatchlist(media);
      setMessage("Added to watchlist");
    } catch (err) {
      setMessage(err?.message ?? "Failed to add");
    }
  };

  const handleRemove = async (media) => {
    try {
      await deleteSearchWatchlist(media);
      setMessage("Removed from watchlist");
    } catch (err) {
      setMessage(err?.message ?? "Failed to remove");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, type, year, genre, popularity, page]);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Search</h1>
        {message && <span className="pill">{message}</span>}
      </div>

      <SearchBar query={query} onChange={setQuery} onSubmit={() => { setPage(1); load(); }} />
      <SearchFilters
        type={type}
        year={year}
        genre={genre}
        popularity={popularity}
        onChange={handleFilterChange}
      />
      <div className="actions-row">
        <button className="btn ghost" onClick={() => { setPage(1); load(); }}>Apply filters</button>
      </div>

      {loading && <div className="muted">Loading...</div>}
      {error && <div className="error">{error}</div>}

      {data && (
        <>
          <SectionCard title={`Results (${data.totalResults || 0})`}>
            <SearchResults results={data.results || []} onAdd={handleAdd} onRemove={handleRemove} />
          </SectionCard>

          <SectionCard title="Featured">
            <MediaList items={data.featured || []} />
          </SectionCard>

          <SectionCard title="Suggestions">
            <MediaList items={data.suggestions || []} />
          </SectionCard>

          <div className="pagination">
            <button className="btn ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Prev
            </button>
            <span className="muted">Page {page}</span>
            <button className="btn ghost" onClick={() => setPage(p => p + 1)}>
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
