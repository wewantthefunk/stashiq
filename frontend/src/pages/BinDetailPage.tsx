import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  adjustInventory,
  ApiError,
  getBin,
  listItems,
} from "../api/client";
import type { BinDetail, Item } from "../api/types";
import { useAuth } from "../context/AuthContext";

export function BinDetailPage() {
  const { binId = "" } = useParams();
  const { token } = useAuth();
  const [bin, setBin] = useState<BinDetail | null>(null);
  const [catalog, setCatalog] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [addItemId, setAddItemId] = useState("");
  const [addQty, setAddQty] = useState(1);

  const reload = useCallback(async () => {
    if (!token || !binId) return;
    const [binData, items] = await Promise.all([
      getBin(binId, token),
      listItems(token),
    ]);
    setBin(binData);
    setCatalog(items);
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

  async function changeQty(
    itemId: string,
    delta: number,
    notes?: string,
  ) {
    if (!token || !binId) return;
    setBusyItem(itemId);
    setError(null);
    try {
      await adjustInventory(
        binId,
        { item_id: itemId, change_amount: delta, notes },
        token,
      );
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed.");
    } finally {
      setBusyItem(null);
    }
  }

  async function addNewItem() {
    if (!addItemId || addQty < 1) return;
    await changeQty(addItemId, addQty, "Added from catalog");
    setAddItemId("");
    setAddQty(1);
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

  return (
    <div className="space-y-6">
      <BinHeader bin={bin} binId={binId} />
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          In this bin
        </h3>
        {bin.contents.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing counted yet.</p>
        ) : (
          <ul className="space-y-3">
            {bin.contents.map((row) => (
              <li
                key={row.item.id}
                className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-white">{row.item.name}</p>
                    <p className="text-xs text-slate-500">{row.item.category}</p>
                  </div>
                  <p className="text-2xl font-bold tabular-nums text-amber-400">
                    {row.quantity}
                  </p>
                </div>
                <QtyControls
                  disabled={busyItem === row.item.id}
                  onMinus={() => changeQty(row.item.id, -1)}
                  onPlus={() => changeQty(row.item.id, 1)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {notInBin.length > 0 && (
        <section className="rounded-xl border border-dashed border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-slate-300">Add equipment</h3>
          <div className="mt-3 space-y-2">
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
            <QuickAddRow
              qty={addQty}
              onQty={setAddQty}
              onAdd={addNewItem}
              disabled={!addItemId || busyItem !== null}
            />
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

function BinHeader({ bin, binId }: { bin: BinDetail; binId: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-mono text-xs text-amber-300">{bin.id}</p>
        <h2 className="text-2xl font-bold text-white">{bin.name}</h2>
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

function QuickAddRow({
  qty,
  onQty,
  onAdd,
  disabled,
}: {
  qty: number;
  onQty: (n: number) => void;
  onAdd: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex gap-2">
      <input
        type="number"
        min={1}
        value={qty}
        onChange={(e) => onQty(Number(e.target.value))}
        className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-center text-white"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={onAdd}
        className="flex-1 rounded-lg bg-slate-100 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
      >
        Add to bin
      </button>
    </div>
  );
}
