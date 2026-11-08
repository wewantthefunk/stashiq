import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { ApiError, listBins, searchItemsInBins } from "../api/client";
import type { BinSummary, ItemBinSearchHit } from "../api/types";
import { useAuth } from "../context/AuthContext";

export function HomePage() {
  const { token } = useAuth();
  const [bins, setBins] = useState<BinSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hits, setHits] = useState<ItemBinSearchHit[] | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    listBins(token)
      .then((data) => {
        if (!cancelled) setBins(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load bins.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function runSearch(term: string) {
    if (!token) return;
    const trimmed = term.trim();
    if (trimmed.length < 2) {
      setHits(null);
      setSearchError(null);
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const results = await searchItemsInBins(trimmed, token);
      setHits(results);
    } catch (err) {
      setHits([]);
      setSearchError(
        err instanceof ApiError ? err.message : "Search failed.",
      );
    } finally {
      setSearching(false);
    }
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    void runSearch(query);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setHits(null);
      setSearchError(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <h2 className="text-sm font-semibold text-white">Find equipment</h2>
        <p className="mt-1 text-xs text-slate-500">
          Search by item name — see which bins have it and how many.
        </p>
        <form onSubmit={handleSearch} className="mt-3 flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="e.g. soccer ball"
            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            disabled={searching || query.trim().length < 2}
            className="shrink-0 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
          >
            {searching ? "…" : "Search"}
          </button>
        </form>
        {searchError && (
          <p className="mt-2 text-sm text-red-300">{searchError}</p>
        )}
        {hits !== null && (
          <SearchResults hits={hits} query={query.trim()} />
        )}
      </section>

      <div className="grid gap-2 sm:grid-cols-2">
        <Link
          to="/labels/print-all?print=1"
          className="block rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-center text-sm font-medium text-slate-200 hover:border-amber-500/50"
        >
          Print all QR labels
          <span className="mt-0.5 block text-xs font-normal text-slate-500">
            2 per letter page — cut in half
          </span>
        </Link>
        <Link
          to="/inventory/print-all?print=1"
          className="block rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-center text-sm font-medium text-slate-200 hover:border-amber-500/50"
        >
          Print all bin inventories
          <span className="mt-0.5 block text-xs font-normal text-slate-500">
            Item lists · page break after each bin
          </span>
        </Link>
      </div>

      <Link
        to="/scan"
        className="flex w-full flex-col items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 px-6 py-8 text-center text-slate-950 shadow-lg shadow-amber-500/20"
      >
        <span className="text-4xl" aria-hidden>
          ⧉
        </span>
        <span className="mt-2 text-xl font-bold">Scan bin QR code</span>
        <span className="mt-1 text-sm font-medium opacity-80">
          Point your camera at an equipment label
        </span>
      </Link>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          All bins
        </h2>
        {loading && <p className="text-sm text-slate-500">Loading…</p>}
        {error && <p className="text-sm text-red-300">{error}</p>}
        {!loading && !error && bins.length === 0 && (
          <p className="text-sm text-slate-500">No bins yet.</p>
        )}
        <ul className="space-y-2">
          {bins.map((bin) => (
            <li key={bin.id}>
              <Link
                to={`/bins/${encodeURIComponent(bin.id)}`}
                className="block rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 hover:border-amber-500/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-white">{bin.name}</span>
                  <span className="rounded-md bg-slate-800 px-2 py-0.5 font-mono text-xs text-amber-300">
                    {bin.id}
                  </span>
                </div>
                {bin.location_notes && (
                  <p className="mt-1 text-left text-sm text-slate-400">
                    {bin.location_notes}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SearchResults({
  hits,
  query,
}: {
  hits: ItemBinSearchHit[];
  query: string;
}) {
  if (hits.length === 0) {
    return (
      <p className="mt-3 text-sm text-slate-500">
        No bins with an item matching “{query}”.
      </p>
    );
  }

  const byItem = new Map<string, ItemBinSearchHit[]>();
  for (const hit of hits) {
    const key = hit.item.id;
    const list = byItem.get(key) ?? [];
    list.push(hit);
    byItem.set(key, list);
  }

  return (
    <div className="mt-3 space-y-3 text-left">
      {[...byItem.values()].map((group) => (
        <div key={group[0].item.id}>
          <p className="text-sm font-medium text-amber-300">
            {group[0].item.name}
            <span className="ml-2 text-xs font-normal text-slate-500">
              {group[0].item.category}
            </span>
          </p>
          <ul className="mt-1 space-y-1">
            {group.map((hit) => (
              <li key={`${hit.bin_id}-${hit.item.id}`}>
                <Link
                  to={`/bins/${encodeURIComponent(hit.bin_id)}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 hover:border-amber-500/40"
                >
                  <span className="text-sm text-white">
                    {hit.bin_name}{" "}
                    <span className="font-mono text-xs text-slate-500">
                      {hit.bin_id}
                    </span>
                  </span>
                  <span className="text-lg font-bold tabular-nums text-amber-400">
                    {hit.quantity}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
