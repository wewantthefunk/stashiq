import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  adjustInventory,
  ApiError,
  getBin,
  listActions,
  listItems,
} from "../api/client";
import type { BinDetail, InventoryAction, Item } from "../api/types";
import { useAuth } from "../context/AuthContext";

export function BinDetailPage() {
  const { binId = "" } = useParams();
  const { token } = useAuth();
  const [bin, setBin] = useState<BinDetail | null>(null);
  const [catalog, setCatalog] = useState<Item[]>([]);
  const [actions, setActions] = useState<InventoryAction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, number>>({});
  const [selectedActionId, setSelectedActionId] = useState("");

  const [addItemId, setAddItemId] = useState("");
  const [addPending, setAddPending] = useState(1);

  const reload = useCallback(async () => {
    if (!token || !binId) return;
    const [binData, items, actionRows] = await Promise.all([
      getBin(binId, token),
      listItems(token),
      listActions(token),
    ]);
    setBin(binData);
    setCatalog(items);
    setActions(actionRows);
  }, [binId, token]);

  useEffect(() => {
    let cancelled = false;
    reload()
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError && err.status === 404
              ? "Bin not found."
              : "Could not load bin.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  function bumpPending(itemId: string, delta: number, currentQty: number) {
    setPending((prev) => {
      const next = (prev[itemId] ?? 0) + delta;
      const total = currentQty + next;
      if (total < 0) return prev;
      if (next === 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: next };
    });
  }

  async function applyChange(itemId: string, delta: number) {
    if (!token || !binId || delta === 0) return;
    if (!selectedActionId) {
      setError("Choose an action before updating.");
      return;
    }
    setBusyItem(itemId);
    setError(null);
    try {
      await adjustInventory(
        binId,
        { item_id: itemId, change_amount: delta, action_id: selectedActionId },
        token,
      );
      setPending((prev) => {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      });
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed.");
    } finally {
      setBusyItem(null);
    }
  }

  const inBinIds = new Set(bin?.contents.map((c) => c.item.id) ?? []);
  const notInBin = catalog.filter((i) => !inBinIds.has(i.id));

  if (!bin && !error) {
    return <p className="text-sm text-slate-500">Loading bin…</p>;
  }

  if (error && !bin) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-red-300">{error}</p>
        <Link to="/scan" className="text-amber-400 underline">
          Scan another label
        </Link>
      </div>
    );
  }

  if (!bin) return null;

  const noActions = actions.length === 0;

  return (
    <div className="space-y-6">
      <BinHeader bin={bin} binId={binId} />
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <ActionPicker
        actions={actions}
        value={selectedActionId}
        onChange={setSelectedActionId}
        noActions={noActions}
      />

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          In this bin
        </h3>
        {bin.contents.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing counted yet.</p>
        ) : (
          <ul className="space-y-3">
            {bin.contents.map((row) => {
              const delta = pending[row.item.id] ?? 0;
              const preview = row.quantity + delta;
              return (
                <li
                  key={row.item.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-white">{row.item.name}</p>
                      <p className="text-xs text-slate-500">
                        {row.item.category}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold tabular-nums text-amber-400">
                        {row.quantity}
                      </p>
                      {delta !== 0 && (
                        <p className="text-xs text-slate-400">
                          →{" "}
                          <span className="font-semibold text-white">
                            {preview}
                          </span>{" "}
                          <span
                            className={
                              delta > 0 ? "text-emerald-400" : "text-red-400"
                            }
                          >
                            ({delta > 0 ? `+${delta}` : delta})
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                  <QtyControls
                    disabled={busyItem === row.item.id}
                    onMinus={() =>
                      bumpPending(row.item.id, -1, row.quantity)
                    }
                    onPlus={() => bumpPending(row.item.id, 1, row.quantity)}
                  />
                  {delta !== 0 && (
                    <button
                      type="button"
                      disabled={
                        busyItem === row.item.id ||
                        !selectedActionId ||
                        noActions
                      }
                      onClick={() => void applyChange(row.item.id, delta)}
                      className="mt-3 w-full rounded-lg bg-amber-500 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
                    >
                      {busyItem === row.item.id ? "Updating…" : "Update"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {notInBin.length > 0 && (
        <section className="rounded-xl border border-dashed border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-slate-300">Add equipment</h3>
          <p className="mt-1 text-xs text-slate-500">
            Set quantity, choose an action above, then update.
          </p>
          <div className="mt-3 space-y-3">
            <select
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              value={addItemId}
              onChange={(e) => setAddItemId(e.target.value)}
            >
              <option value="">Select item…</option>
              {notInBin.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.category})
                </option>
              ))}
            </select>
            <QtyControls
              disabled={!addItemId || busyItem !== null}
              onMinus={() => setAddPending((n) => Math.max(1, n - 1))}
              onPlus={() => setAddPending((n) => n + 1)}
            />
            <p className="text-center text-sm text-slate-400">
              Adding{" "}
              <span className="font-semibold text-amber-300">{addPending}</span>{" "}
              {addPending === 1 ? "unit" : "units"}
            </p>
            <button
              type="button"
              disabled={
                !addItemId ||
                busyItem !== null ||
                !selectedActionId ||
                noActions
              }
              onClick={() => void applyChange(addItemId, addPending)}
              className="w-full rounded-lg bg-slate-100 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
            >
              Update
            </button>
          </div>
        </section>
      )}

      <Link
        to="/scan"
        className="block text-center text-sm text-amber-400 hover:underline"
      >
        Scan another bin
      </Link>
    </div>
  );
}

function ActionPicker({
  actions,
  value,
  onChange,
  noActions,
}: {
  actions: InventoryAction[];
  value: string;
  onChange: (id: string) => void;
  noActions: boolean;
}) {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
      <label className="block text-left text-sm font-medium text-white">
        Action
        <span className="mt-0.5 block text-xs font-normal text-slate-500">
          Required before you update counts
        </span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={noActions}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-amber-500 disabled:opacity-60"
        >
          <option value="">
            {noActions ? "No actions — ask an admin" : "Select action…"}
          </option>
          {actions.map((action) => (
            <option key={action.id} value={action.id}>
              {action.name} ({action.id})
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}

function BinHeader({ bin, binId }: { bin: BinDetail; binId: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-mono text-xs text-amber-300">{bin.id}</p>
        <h2 className="text-2xl font-bold text-white">{bin.name}</h2>
        {bin.location && (
          <p className="mt-1 text-sm text-emerald-400/90">
            {bin.location.name}
            <span className="ml-1 font-mono text-xs text-slate-500">
              {bin.location.id}
            </span>
          </p>
        )}
        {bin.location_notes && (
          <p className="mt-1 text-sm text-slate-400">{bin.location_notes}</p>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
        <Link
          to={`/bins/${encodeURIComponent(binId)}/inventory-print?print=1`}
          className="rounded-lg border border-slate-600 px-3 py-1.5 text-center text-xs font-medium text-slate-200 hover:border-amber-500"
        >
          Print list
        </Link>
        <Link
          to={`/bins/${encodeURIComponent(binId)}/label`}
          className="rounded-lg border border-slate-600 px-3 py-1.5 text-center text-xs font-medium text-slate-200 hover:border-amber-500"
        >
          Print label
        </Link>
      </div>
    </div>
  );
}

function QtyControls({
  disabled,
  onMinus,
  onPlus,
}: {
  disabled: boolean;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="mt-3 flex gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={onMinus}
        className="flex-1 rounded-lg border border-slate-600 py-2 text-lg font-bold text-white hover:border-red-400 disabled:opacity-50"
      >
        −
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onPlus}
        className="flex-1 rounded-lg bg-amber-500 py-2 text-lg font-bold text-slate-950 disabled:opacity-50"
      >
        +
      </button>
    </div>
  );
}
