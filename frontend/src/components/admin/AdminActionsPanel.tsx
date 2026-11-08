import { useEffect, useState, type FormEvent } from "react";

import {
  ApiError,
  createAction,
  deleteAction,
  listActions,
} from "../../api/client";
import type { InventoryAction } from "../../api/types";
import { useAuth } from "../../context/AuthContext";

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-amber-500";

export function AdminActionsPanel() {
  const { token } = useAuth();
  const [actions, setActions] = useState<InventoryAction[]>([]);
  const [actionId, setActionId] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    if (!token) return;
    setActions(await listActions(token));
  }

  useEffect(() => {
    void refresh().catch(() => setError("Could not load actions."));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const created = await createAction(
        {
          id: actionId.trim().toUpperCase(),
          name: name.trim(),
        },
        token,
      );
      setActionId("");
      setName("");
      await refresh();
      setSuccess(`Created action ${created.id}.`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not create action.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    if (
      !window.confirm(
        `Remove action ${id}? Past audit entries keep this code; new updates cannot use it.`,
      )
    ) {
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      await deleteAction(id, token);
      await refresh();
      setSuccess(`Removed action ${id}.`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not remove action.",
      );
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
      >
        <h3 className="text-sm font-semibold text-white">New action</h3>
        <p className="text-xs text-slate-500">
          Coaches must pick an action before updating bin counts (e.g. restock,
          class use, transfer).
        </p>
        <label className="block text-left text-sm text-slate-300">
          Action id
          <span className="mt-0.5 block text-xs text-slate-500">
            Short code (e.g. RESTOCK, CLASS)
          </span>
          <input
            required
            maxLength={32}
            value={actionId}
            onChange={(e) => setActionId(e.target.value.toUpperCase())}
            className={inputClass}
            placeholder="RESTOCK"
          />
        </label>
        <label className="block text-left text-sm text-slate-300">
          Name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Restock from warehouse"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60"
        >
          {loading ? "Saving…" : "Create action"}
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
          Existing actions
        </h3>
        {actions.length === 0 ? (
          <p className="text-sm text-slate-500">No actions yet.</p>
        ) : (
          <ul className="space-y-2">
            {actions.map((action) => (
              <li
                key={action.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 px-3 py-2"
              >
                <div className="min-w-0 text-left">
                  <p className="font-medium text-white">{action.name}</p>
                  <p className="font-mono text-xs text-amber-300">{action.id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(action.id)}
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
