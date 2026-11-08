import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { ApiError, getBin, listBins } from "../api/client";
import { BinInventoryPrintBlock } from "../components/BinInventoryPrintBlock";
import type { BinDetail } from "../api/types";
import { useAuth } from "../context/AuthContext";

export function PrintAllInventoryPage() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const [bins, setBins] = useState<BinDetail[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function load() {
      try {
        const summaries = await listBins(token!);
        const details = await Promise.all(
          summaries.map((s) => getBin(s.id, token!)),
        );
        if (!cancelled) {
          setBins(
            details.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Could not load inventory.",
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

  useEffect(() => {
    if (searchParams.get("print") !== "1" || loading || bins.length === 0) return;
    const timer = window.setTimeout(() => window.print(), 500);
    return () => window.clearTimeout(timer);
  }, [searchParams, loading, bins.length]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-slate-600">
        Preparing inventory lists…
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

  if (bins.length === 0) {
    return (
      <div className="mx-auto max-w-md p-6 text-center text-slate-600">
        <p>No bins yet.</p>
        <Link to="/admin" className="mt-4 inline-block text-amber-700 underline">
          Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="inventory-print-page inventory-print-all label-page min-h-dvh bg-slate-200 print:bg-white">
      <div className="no-print mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-2 p-4">
        <p className="text-sm text-slate-700">
          {bins.length} bin{bins.length === 1 ? "" : "s"} · one bin per printed
          section
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
          <h1 className="text-2xl font-bold">StashIQ — full inventory</h1>
          <p className="text-sm text-slate-600">
            {new Date().toLocaleString()}
          </p>
        </div>
        {bins.map((bin, index) => (
          <BinInventoryPrintBlock
            key={bin.id}
            bin={bin}
            pageBreakAfter={index < bins.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
