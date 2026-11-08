import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { ApiError, listBins, listLocations } from "../api/client";
import { LocationBinsPrintBlock } from "../components/LocationBinsPrintBlock";
import type { BinSummary, Location } from "../api/types";
import { useAuth } from "../context/AuthContext";

type LocationGroup = {
  location: Location | null;
  bins: BinSummary[];
};

export function PrintLocationsBinsPage() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const [bins, setBins] = useState<BinSummary[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function load() {
      try {
        const [binRows, locRows] = await Promise.all([
          listBins(token!),
          listLocations(token!),
        ]);
        if (!cancelled) {
          setBins(
            binRows.sort((a, b) =>
              a.id.localeCompare(b.id, undefined, { numeric: true }),
            ),
          );
          setLocations(
            locRows.sort((a, b) =>
              a.id.localeCompare(b.id, undefined, { numeric: true }),
            ),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Could not load data.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const groups = useMemo((): LocationGroup[] => {
    const byLoc = new Map<string, BinSummary[]>();
    const unassigned: BinSummary[] = [];

    for (const bin of bins) {
      if (bin.location_id) {
        const list = byLoc.get(bin.location_id) ?? [];
        list.push(bin);
        byLoc.set(bin.location_id, list);
      } else {
        unassigned.push(bin);
      }
    }

    const ordered: LocationGroup[] = locations.map((loc) => ({
      location: loc,
      bins: byLoc.get(loc.id) ?? [],
    }));

    if (unassigned.length > 0) {
      ordered.push({ location: null, bins: unassigned });
    }

    return ordered;
  }, [bins, locations]);

  useEffect(() => {
    if (searchParams.get("print") !== "1" || loading) return;
    if (groups.length === 0) return;
    const timer = window.setTimeout(() => window.print(), 500);
    return () => window.clearTimeout(timer);
  }, [searchParams, loading, groups.length]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-slate-600">
        Preparing location lists…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md p-6 text-center text-red-700">
        <p>{error}</p>
        <Link to="/" className="mt-4 inline-block text-amber-700 underline">
          Home
        </Link>
      </div>
    );
  }

  return (
    <div className="inventory-print-page inventory-print-all label-page min-h-dvh bg-slate-200 print:bg-white">
      <div className="no-print mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-2 p-4">
        <p className="text-sm text-slate-700">
          {groups.length} location{groups.length === 1 ? "" : "s"} · page break
          after each
        </p>
        <div className="flex gap-2">
          <Link
            to="/"
            className="rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm text-slate-800"
          >
            Home
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Print all
          </button>
        </div>
      </div>

      <div className="inventory-print-body mx-auto max-w-[7in] space-y-8 bg-white p-6 print:mx-0 print:max-w-none print:space-y-0 print:p-0">
        <div className="no-print mb-6 border-b border-slate-300 pb-4 text-black">
          <h1 className="text-2xl font-bold">StashIQ — bins by location</h1>
          <p className="text-sm text-slate-600">
            {new Date().toLocaleString()}
          </p>
        </div>
        {groups.map((group, index) => (
          <LocationBinsPrintBlock
            key={group.location?.id ?? "__unassigned__"}
            location={group.location}
            bins={group.bins}
            pageBreakAfter={index < groups.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
