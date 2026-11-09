import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  ApiError,
  fetchBinQrObjectUrl,
  getPublicConfig,
  listBins,
} from "../api/client";
import type { BinSummary } from "../api/types";
import { BinLabelCard } from "../components/BinLabelCard";
import { useAuth } from "../context/AuthContext";
import { chunkPairs } from "../lib/chunkPairs";
import { isFirefox } from "../lib/isFirefox";

type LabelRow = {
  binId: string;
  name: string;
  qrUrl: string;
  scanUrl: string;
};

export function PrintAllLabelsPage() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const [labels, setLabels] = useState<LabelRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const objectUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function load() {
      try {
        const [bins, site] = await Promise.all([
          listBins(token!),
          getPublicConfig(),
        ]);
        const base = site.public_url.replace(/\/$/, "");
        const rows: LabelRow[] = await Promise.all(
          bins.map(async (bin: BinSummary) => {
            const qrUrl = await fetchBinQrObjectUrl(bin.id, token!);
            objectUrlsRef.current.push(qrUrl);
            return {
              binId: bin.id,
              name: bin.name,
              qrUrl,
              scanUrl: `${base}/bins/${encodeURIComponent(bin.id)}`,
            };
          }),
        );
        if (!cancelled) {
          setLabels(rows);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Could not load labels.",
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
    return () => {
      for (const url of objectUrlsRef.current) URL.revokeObjectURL(url);
      objectUrlsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (searchParams.get("print") !== "1" || loading || labels.length === 0) {
      return;
    }
    const timer = window.setTimeout(() => window.print(), 1200);
    return () => window.clearTimeout(timer);
  }, [searchParams, loading, labels.length]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-slate-600">
        Preparing {labels.length ? labels.length : ""} labels…
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

  if (labels.length === 0) {
    return (
      <div className="mx-auto max-w-md p-6 text-center text-slate-600">
        <p>No bins to print.</p>
        <Link to="/admin" className="mt-4 inline-block text-amber-700 underline">
          Create bins in Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="bulk-labels-print label-page min-h-dvh bg-slate-200 print:min-h-0 print:bg-white">
      <div className="no-print mx-auto max-w-2xl space-y-2 p-4">
        {isFirefox() && (
          <p className="rounded-lg border border-amber-600/50 bg-amber-950/40 px-3 py-2 text-xs text-amber-100">
            Firefox’s print engine often breaks 2-up label pages. For correct
            layout, use Chrome or Brave, or print to PDF from Chrome and send
            that to the printer.
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-700">
          {labels.length} label{labels.length === 1 ? "" : "s"} · 2 per page
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
      </div>

      <div className="bulk-labels-grid mx-auto max-w-[8.5in] print:max-w-none">
        {chunkPairs(labels).map((sheet, sheetIndex) => (
          <div
            key={sheetIndex}
            className={
              sheet.length === 1
                ? "bulk-label-sheet bulk-label-sheet--single"
                : "bulk-label-sheet"
            }
          >
            {sheet.map((row, slotIndex) => (
              <div
                key={row.binId}
                className={`bulk-label-slot flex items-center justify-center border border-dashed border-slate-400 bg-white print:border-slate-300 ${
                  slotIndex === 0 ? "bulk-label-slot--top" : "bulk-label-slot--bottom"
                }`}
              >
                <BinLabelCard
                  binId={row.binId}
                  name={row.name}
                  qrUrl={row.qrUrl}
                  scanUrl={row.scanUrl}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
