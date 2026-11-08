import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";

import {
  ApiError,
  createBin,
  deleteBin,
  listBins,
  listLocations,
  updateBin,
} from "../../api/client";
import type { BinSummary, Location } from "../../api/types";
import { useAuth } from "../../context/AuthContext";

export function AdminBinsPanel() {
  const { token } = useAuth();
  const [bins, setBins] = useState<BinSummary[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [binId, setBinId] = useState("");
  const [name, setName] = useState("");
  const [locationNotes, setLocationNotes] = useState("");
  const [newBinLocationId, setNewBinLocationId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    if (!token) return;
    const [binRows, locRows] = await Promise.all([
      listBins(token),
      listLocations(token),
    ]);
    setBins(binRows);
    setLocations(locRows);
  }

  useEffect(() => {
    void refresh().catch(() => setError("Could not load bins."));
  }, [token]);

  async function handleDelete(bin: BinSummary) {
    if (!token) return;
    if (!bin.is_empty) return;
    if (
      !window.confirm(
        `Remove bin ${bin.id} (${bin.name})? Its QR code will stop working. Audit history is kept.`,
      )
    ) {
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      await deleteBin(bin.id, token);
      await refresh();
      setSuccess(`Removed bin ${bin.id}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove bin.");
    }
  }

  async function assignLocation(bin: BinSummary, locationId: string) {
    if (!token) return;
    setError(null);
    try {
      await updateBin(
        bin.id,
        { location_id: locationId || null },
        token,
      );
      await refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not update location.",
      );
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setSuccess(null);
    setLastCreatedId(null);
    setLoading(true);
    try {
      const created = await createBin(
        {
          id: binId.trim().toUpperCase(),
          name: name.trim(),
          location_notes: locationNotes.trim() || null,
          location_id: newBinLocationId || null,
        },
        token,
      );
      setBinId("");
      setName("");
      setLocationNotes("");
      setNewBinLocationId("");
      setLastCreatedId(created.id);
      await refresh();
      setSuccess(`Created bin ${created.id}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create bin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
      >
        <h3 className="text-sm font-semibold text-white">New bin</h3>
        <Field label="Bin id" hint="Short label on the QR sticker (e.g. B1)">
          <input
            required
            maxLength={32}
            value={binId}
            onChange={(e) => setBinId(e.target.value.toUpperCase())}
            className={inputClass}
            placeholder="B1"
          />
        </Field>
        <Field label="Name" hint="What coaches will see in the app">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Cones & agility gear"
          />
        </Field>
        <Field label="Location" hint="Where this bin lives (Admin → Locations)">
          <select
            value={newBinLocationId}
            onChange={(e) => setNewBinLocationId(e.target.value)}
            className={inputClass}
          >
            <option value="">— None —</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} ({loc.id})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Location notes" hint="Optional — shelf, closet…">
          <input
            value={locationNotes}
            onChange={(e) => setLocationNotes(e.target.value)}
            className={inputClass}
          />
        </Field>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60"
        >
          {loading ? "Saving…" : "Create bin"}
        </button>
      </form>

      {error && <Alert tone="error">{error}</Alert>}
      {success && (
        <Alert tone="success">
          {success}
          {lastCreatedId && (
            <>
              {" "}
              <Link
                to={`/bins/${encodeURIComponent(lastCreatedId)}/label?print=1`}
                className="font-semibold text-emerald-100 underline"
              >
                Print label
              </Link>
            </>
          )}
        </Alert>
      )}

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-400">
          Existing bins
        </h3>
        <ul className="space-y-2">
          {bins.map((bin) => (
            <li
              key={bin.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 px-3 py-2"
            >
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate font-medium text-white">{bin.name}</p>
                <p className="font-mono text-xs text-amber-300">{bin.id}</p>
                <label className="mt-2 block text-xs text-slate-500">
                  Location
                  <select
                    value={bin.location_id ?? ""}
                    onChange={(e) =>
                      void assignLocation(bin, e.target.value)
                    }
                    className="mt-0.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-white"
                  >
                    <option value="">— None —</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <div className="flex gap-2">
                  <Link
                    to={`/bins/${encodeURIComponent(bin.id)}/label`}
                    className="rounded-lg border border-amber-500/50 px-2 py-1 text-xs text-amber-300"
                  >
                    Label
                  </Link>
                  <Link
                    to={`/bins/${encodeURIComponent(bin.id)}`}
                    className="rounded-lg bg-slate-800 px-2 py-1 text-xs text-slate-200"
                  >
                    Open
                  </Link>
                </div>
                {bin.is_empty ? (
                  <button
                    type="button"
                    onClick={() => void handleDelete(bin)}
                    className="rounded-lg border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:border-red-400"
                  >
                    Remove
                  </button>
                ) : (
                  <span className="max-w-[8rem] text-right text-[10px] leading-tight text-slate-500">
                    Empty all items before remove —{" "}
                    <Link
                      to={`/bins/${encodeURIComponent(bin.id)}`}
                      className="text-amber-400/90 underline"
                    >
                      open bin
                    </Link>
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-amber-500";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-left text-sm text-slate-300">
      {label}
      {hint && (
        <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>
      )}
      {children}
    </label>
  );
}

function Alert({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: ReactNode;
}) {
  const styles =
    tone === "error"
      ? "border-red-500/40 bg-red-500/10 text-red-200"
      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
  return (
    <p className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>{children}</p>
  );
}
