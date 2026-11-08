import { useEffect, useState, type FormEvent } from "react";

import { ApiError, createItem, listItems, updateItem } from "../../api/client";
import type { Item } from "../../api/types";
import { useAuth } from "../../context/AuthContext";

export function AdminItemsPanel() {
  const { token } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [sku, setSku] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function refresh() {
    if (!token) return;
    setItems(await listItems(token));
  }

  useEffect(() => {
    void refresh().catch(() => setError("Could not load catalog."));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const created = await createItem(
        {
          name: name.trim(),
          category: category.trim(),
          sku: sku.trim() || null,
        },
        token,
      );
      setName("");
      setCategory("");
      setSku("");
      await refresh();
      setSuccess(`Added ${created.name} to the catalog.`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not create item.",
      );
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
        <h3 className="text-sm font-semibold text-white">New catalog item</h3>
        <label className="block text-left text-sm text-slate-300">
          Name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Rubber playground ball"
          />
        </label>
        <label className="block text-left text-sm text-slate-300">
          Category
          <input
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
            placeholder="balls"
          />
        </label>
        <label className="block text-left text-sm text-slate-300">
          SKU / internal code (optional)
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className={inputClass}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60"
        >
          {loading ? "Saving…" : "Create item"}
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
        <h3 className="mb-2 text-sm font-semibold text-slate-400">Catalog</h3>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">No items yet.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) =>
              editingId === item.id ? (
                <ItemEditRow
                  key={item.id}
                  item={item}
                  onCancel={() => setEditingId(null)}
                  onSaved={async (label) => {
                    setEditingId(null);
                    setError(null);
                    setSuccess(`Updated ${label}.`);
                    await refresh();
                  }}
                  onError={(msg) => setError(msg)}
                />
              ) : (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-slate-800 px-3 py-2 text-left"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-white">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.category}</p>
                    {item.sku && (
                      <p className="mt-0.5 font-mono text-xs text-slate-400">
                        {item.sku}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSuccess(null);
                      setEditingId(item.id);
                    }}
                    className="shrink-0 rounded-lg border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:border-amber-500/50"
                  >
                    Edit
                  </button>
                </li>
              ),
            )}
          </ul>
        )}
      </section>
    </div>
  );
}

function ItemEditRow({
  item,
  onCancel,
  onSaved,
  onError,
}: {
  item: Item;
  onCancel: () => void;
  onSaved: (name: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const { token } = useAuth();
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [sku, setSku] = useState(item.sku ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      const updated = await updateItem(
        item.id,
        {
          name: name.trim(),
          category: category.trim(),
          sku: sku.trim() || null,
        },
        token,
      );
      await onSaved(updated.name);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Could not update item.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="rounded-lg border border-amber-500/30 bg-slate-900 px-3 py-3">
      <form onSubmit={handleSave} className="space-y-2">
        <label className="block text-left text-xs text-slate-400">
          Name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block text-left text-xs text-slate-400">
          Category
          <input
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block text-left text-xs text-slate-400">
          SKU (optional)
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className={inputClass}
          />
        </label>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-slate-600 py-2 text-sm text-slate-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg bg-amber-500 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </li>
  );
}

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-amber-500";
