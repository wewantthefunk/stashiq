import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { ApiError, getBin } from "../api/client";
import { BinInventoryPrintBlock } from "../components/BinInventoryPrintBlock";
import type { BinDetail } from "../api/types";
import { useAuth } from "../context/AuthContext";

export function BinInventoryPrintPage() {
  const { binId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  const [bin, setBin] = useState<BinDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !binId) return;
    let cancelled = false;
    getBin(binId, token)
      .then((data) => {
        if (!cancelled) setBin(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Could not load bin.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, binId]);

  useEffect(() => {
    if (searchParams.get("print") !== "1" || !bin) return;
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, [searchParams, bin]);

  if (error) {
    return (
      <div className="mx-auto max-w-md p-6 text-center text-red-700">
        <p>{error}</p>
        <Link
          to={`/bins/${encodeURIComponent(binId)}`}
          className="mt-4 inline-block text-amber-700 underline"
        >
          Back to bin
        </Link>
      </div>
    );
  }

  if (!bin) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-slate-600">
        Preparing inventory list…
      </div>
    );
  }

  return (
    <div className="inventory-print-page label-page min-h-dvh bg-slate-200 print:bg-white">
      <div className="no-print mx-auto flex max-w-2xl justify-end gap-2 p-4">
        <Link
          to={`/bins/${encodeURIComponent(binId)}`}
          className="rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm text-slate-800"
        >
          Back to bin
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950"
        >
          Print
        </button>
      </div>
      <div className="inventory-print-body mx-auto max-w-[7in] bg-white p-6 print:mx-0 print:max-w-none print:p-0">
        <BinInventoryPrintBlock bin={bin} pageBreakAfter={false} />
      </div>
    </div>
  );
}
