import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import {
  ApiError,
  getUserActivityReport,
  listUsers,
} from "../api/client";
import type { InventoryLog, UserActivityReport, UserListEntry } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { formatLogTimestamp } from "../lib/formatLog";

function defaultFromDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ReportPage() {
  const { token, user, isAdmin, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserListEntry[]>([]);
  const [userId, setUserId] = useState("");
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(todayIso);
  const [report, setReport] = useState<UserActivityReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    if (!isAdmin) {
      setUserId(user.id);
    }
  }, [isAdmin, user, authLoading]);

  useEffect(() => {
    if (!token || !isAdmin) return;
    listUsers(token)
      .then((rows) => {
        setUsers(rows);
        setUserId((prev) => prev || rows[0]?.id || "");
      })
      .catch(() => setError("Could not load users."));
  }, [token, isAdmin]);

  const selectedLabel = useMemo(() => {
    if (!isAdmin && user) return user.email;
    const row = users.find((u) => u.id === userId);
    return row?.email ?? "";
  }, [isAdmin, user, users, userId]);

  const runReport = useCallback(async () => {
    if (!token || !userId) return;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const data = await getUserActivityReport(token, {
        userId,
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      setReport(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load report.",
      );
    } finally {
      setLoading(false);
    }
  }, [token, userId, fromDate, toDate]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void runReport();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Activity report</h2>
        <p className="mt-1 text-sm text-slate-400">
          See where equipment moved based on each saved action (e.g. CHECKOUT).
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/80 p-4"
      >
        {isAdmin ? (
          <label className="block text-left text-sm text-slate-300">
            User
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className={fieldClass}
            >
              <option value="">Select user…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-sm text-slate-300">
            User: <span className="text-white">{selectedLabel}</span>
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <label className="block text-left text-sm text-slate-300">
            From
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block text-left text-sm text-slate-300">
            To
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className={fieldClass}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !userId}
          className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Run report"}
        </button>
      </form>

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      {report && (
        <ReportResults report={report} loading={loading} />
      )}
    </div>
  );
}

function ReportResults({
  report,
  loading,
}: {
  report: UserActivityReport;
  loading: boolean;
}) {
  const range =
    report.from_date || report.to_date
      ? `${report.from_date ?? "…"} → ${report.to_date ?? "…"}`
      : "All dates";

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        <span className="text-white">{report.username}</span> · {range} ·{" "}
        {report.entries.length} adjustment
        {report.entries.length === 1 ? "" : "s"}
      </p>

      {report.action_summary.length > 0 && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Actions in range
          </h3>
          <ul className="mt-2 space-y-1">
            {report.action_summary.map((row) => (
              <li
                key={row.action}
                className="flex justify-between text-sm text-slate-200"
              >
                <span>{row.action}</span>
                <span className="font-mono text-amber-300">{row.count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {loading && (
        <p className="text-sm text-slate-500">Refreshing…</p>
      )}

      {!loading && report.entries.length === 0 && (
        <p className="text-sm text-slate-500">No activity in this date range.</p>
      )}

      <ul className="space-y-3">
        {report.entries.map((entry) => (
          <ReportEntryRow key={entry.id} entry={entry} />
        ))}
      </ul>
    </div>
  );
}

function ReportEntryRow({ entry }: { entry: InventoryLog }) {
  const positive = entry.change_amount > 0;
  return (
    <li className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-left">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-slate-500">
            {formatLogTimestamp(entry.timestamp)}
          </p>
          {entry.action_name && (
            <p className="mt-1 text-sm font-semibold text-sky-300">
              {entry.action_name}
              {entry.action_id && (
                <span className="ml-1 font-mono text-xs font-normal text-slate-500">
                  {entry.action_id}
                </span>
              )}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-sm font-semibold ${
            positive
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-red-500/20 text-red-300"
          }`}
        >
          {positive ? `+${entry.change_amount}` : entry.change_amount}
        </span>
      </div>
      <p className="mt-2 font-medium text-white">{entry.item_name}</p>
      <p className="text-sm text-slate-400">
        <Link
          to={`/bins/${encodeURIComponent(entry.bin_id)}`}
          className="text-amber-400 hover:underline"
        >
          {entry.bin_id}
        </Link>
        {" · "}
        {entry.bin_name} · qty {entry.previous_quantity} →{" "}
        {entry.new_quantity}
      </p>
      {entry.notes && (
        <p className="mt-1 text-xs italic text-slate-500">“{entry.notes}”</p>
      )}
    </li>
  );
}

const fieldClass =
  "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-amber-500";
