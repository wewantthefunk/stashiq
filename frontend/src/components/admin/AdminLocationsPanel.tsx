import { useEffect, useState, type FormEvent } from "react";

import {
  ApiError,
  createLocation,
  deleteLocation,
  listLocations,
} from "../../api/client";
import type { Location } from "../../api/types";
import { useAuth } from "../../context/AuthContext";

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-amber-500";

export function AdminLocationsPanel() {
  const { token } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [locId, setLocId] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    if (!token) return;
    setLocations(await listLocations(token));
  }

  useEffect(() => {
    void refresh().catch(() => setError("Could not load locations."));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const created = await createLocation(
        {
          id: locId.trim().toUpperCase(),
          name: name.trim(),
          address: address.trim(),
        },
        token,
      );
      setLocId("");
      setName("");
      setAddress("");
      await refresh();
      setSuccess(`Created location ${created.id}.`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not create location.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    if (
      !window.confirm(
        `Remove location ${id}? Bins at this location will become unassigned.`,
      )
    ) {
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      await deleteLocation(id, token);
      await refresh();
      setSuccess(`Removed location ${id}.`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not remove location.",
      );
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
      >
        <h3 className="text-sm font-semibold text-white">New location</h3>
        <label className="block text-left text-sm text-slate-300">
          Location id
          <span className="mt-0.5 block text-xs text-slate-500">
            Short code (e.g. VAN1, GYM-A)
          </span>
          <input
            required
            maxLength={32}
            value={locId}
            onChange={(e) => setLocId(e.target.value.toUpperCase())}
            className={inputClass}
            placeholder="VAN1"
          />
        </label>
        <label className="block text-left text-sm text-slate-300">
          Name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Blue van"
          />
        </label>
        <label className="block text-left text-sm text-slate-300">
          Address
          <input
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={inputClass}
            placeholder="123 Main St, Austin TX"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60"
        >
          {loading ? "Saving…" : "Create location"}
        </button>
      </form>

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {success}
        </p>
      )}

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-400">
          Existing locations
        </h3>
        {locations.length === 0 ? (
          <p className="text-sm text-slate-500">No locations yet.</p>
        ) : (
          <ul className="space-y-2">
            {locations.map((loc) => (
              <li
                key={loc.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-slate-800 px-3 py-2"
              >
                <div className="min-w-0 text-left">
                  <p className="font-medium text-white">{loc.name}</p>
                  <p className="font-mono text-xs text-amber-300">{loc.id}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{loc.address}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(loc.id)}
                  className="shrink-0 rounded-lg border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:border-red-400"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
