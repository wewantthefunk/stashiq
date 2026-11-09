import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import {
  ApiError,
  fetchBinQrObjectUrl,
  getBin,
  getPublicConfig,
} from "../api/client";
import { BinLabelCard } from "../components/BinLabelCard";
import type { BinDetail } from "../api/types";
import { useAuth } from "../context/AuthContext";

export function BinLabelPage() {
  const { binId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  const [bin, setBin] = useState<BinDetail | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanUrl, setScanUrl] = useState("");

  useEffect(() => {
    if (!token || !binId) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    async function load() {
      try {
        const [binData, site] = await Promise.all([
          getBin(binId, token!),
          getPublicConfig(),
        ]);
        if (cancelled) return;
        setBin(binData);
        setScanUrl(
          `${site.public_url.replace(/\/$/, "")}/bins/${encodeURIComponent(binId)}`,
        );
        objectUrl = await fetchBinQrObjectUrl(binId, token!);
        if (!cancelled) setQrUrl(objectUrl);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Could not load label.",
          );
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [token, binId]);

  useEffect(() => {
    if (searchParams.get("print") !== "1" || !bin || !qrUrl) return;
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, [searchParams, bin, qrUrl]);

  if (error) {
    return (
      <div className="mx-auto max-w-md p-6 text-center text-red-700">
        <p>{error}</p>
        <Link to="/admin" className="mt-4 inline-block text-amber-700 underline">
          Back to admin
        </Link>
      </div>
    );
  }

  if (!bin || !qrUrl) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-slate-600">
        Preparing label…
      </div>
    );
  }

  return (
    <div className="bulk-labels-print label-page min-h-dvh bg-slate-200 print:bg-white">
      <div className="no-print mx-auto flex max-w-2xl justify-end gap-2 p-4">
        <Link
          to={`/bins/${encodeURIComponent(binId)}`}
          className="rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm text-slate-800"
        >
          Bin contents
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950"
        >
          Print label
        </button>
      </div>

      <div className="bulk-labels-grid mx-auto max-w-[8.5in] print:max-w-none">
        <div className="bulk-label-sheet bulk-label-sheet--single">
          <div className="bulk-label-slot flex items-center justify-center border border-dashed border-slate-400 bg-white print:border-slate-300">
            <BinLabelCard
              binId={bin.id}
              name={bin.name}
              qrUrl={qrUrl}
              scanUrl={scanUrl}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
