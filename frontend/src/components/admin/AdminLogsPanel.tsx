import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { listBins, listLogs } from "../../api/client";
import type { BinSummary, InventoryLog } from "../../api/types";
import { useAuth } from "../../context/AuthContext";
import { formatLogTimestamp } from "../../lib/formatLog";

export function AdminLogsPanel() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [bins, setBins] = useState<BinSummary[]>([]);
  const [binFilter, setBinFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listLogs(token, {
        bin_id: binFilter || undefined,
        limit: 150,
      });
      setLogs(data);
    } catch {
      setError("Could not load audit log.");
    } finally {
      setLoading(false);
    }
  }, [token, binFilter]);

  useEffect(() => {
    if (!token) return;
    listBins(token)
      .then(setBins)
      .catch(() => setBins([]));
  }, [token]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[10rem] flex-1 text-left text-sm text-slate-300">
          Filter by bin
          <select
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            value={binFilter}
            onChange={(e) => setBinFilter(e.target.value)}
          >
            <option value="">All bins</option>
            {bins.map((b) => (
              <option key={b.id} value={b.id}>
                {b.id} — {b.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void loadLogs()}
          className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200"
        >
          Refresh
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && logs.length === 0 && (
        <p className="text-sm text-slate-500">No adjustments recorded yet.</p>
      )}

      <ul className="space-y-3">
        {logs.map((entry) => (
          <li
            key={entry.id}
            className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-left"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-slate-500">
                {formatLogTimestamp(entry.timestamp)}
              </p>
              <DeltaBadge amount={entry.change_amount} />
            </div>
            <p className="mt-1 font-medium text-white">{entry.item_name}</p>
            <p className="text-sm text-slate-400">
              <Link
                to={`/bins/${entry.bin_id}`}
                className="text-amber-400 hover:underline"
              >
                {entry.bin_id}
              </Link>
              {" · "}
              {entry.bin_name}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {entry.username} · {entry.previous_quantity} →{" "}
              {entry.new_quantity}
            </p>
            {entry.action_name && (
              <p className="mt-1 text-xs font-medium text-sky-400/90">
                Action: {entry.action_name}
              </p>
            )}
            {entry.notes && (
              <p className="mt-2 text-sm italic text-slate-400">
                “{entry.notes}”
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DeltaBadge({ amount }: { amount: number }) {
  const positive = amount > 0;
  const label = positive ? `+${amount}` : String(amount);
  return (
    <span
      className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-sm font-semibold ${
        positive
          ? "bg-emerald-500/20 text-emerald-300"
          : "bg-red-500/20 text-red-300"
      }`}
    >
      {label}
    </span>
  );
}
