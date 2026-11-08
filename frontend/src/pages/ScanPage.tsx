import { useCallback, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { QrScanner } from "../components/QrScanner";
import { parseBinIdFromScan } from "../lib/parseBinQr";

export function ScanPage() {
  const navigate = useNavigate();
  const [manualId, setManualId] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);

  const goToBin = useCallback(
    (payload: string) => {
      const binId = parseBinIdFromScan(payload);
      if (!binId) {
        setScanError("That QR code is not a StashIQ bin label.");
        return;
      }
      setScanError(null);
      navigate(`/bins/${encodeURIComponent(binId)}`);
    },
    [navigate],
  );

  function handleManual(e: FormEvent) {
    e.preventDefault();
    goToBin(manualId);
  }

  return (
    <div className="space-y-6">
      <ScanIntro />
      <QrScanner onScan={goToBin} onError={(msg) => setScanError(msg)} />
      {scanError && (
        <p className="text-sm text-red-300" role="alert">
          {scanError}
        </p>
      )}
      <form onSubmit={handleManual} className="space-y-2">
        <label className="block text-sm text-slate-400">
          Or type bin id (e.g. B1)
          <input
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white outline-none focus:border-amber-500"
            value={manualId}
            onChange={(e) => setManualId(e.target.value.toUpperCase())}
            placeholder="B1"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-xl border border-slate-600 py-2.5 text-sm font-medium text-white hover:border-amber-500"
        >
          Open bin
        </button>
      </form>
    </div>
  );
}

function ScanIntro() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white">Scan equipment bin</h2>
      <p className="mt-1 text-sm text-slate-400">
        Labels link to this app. After scanning you can add or remove stock on
        the spot.
      </p>
    </div>
  );
}
