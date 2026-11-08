import { useEffect, useState, type FormEvent } from "react";

import { ApiError, createItem, listItems } from "../../api/client";
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
          <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-2 px-3 py-2 text-left"
              >
                <div>
                  <p className="font-medium text-white">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.category}</p>
                </div>
                {item.sku && (
                  <span className="font-mono text-xs text-slate-400">
                    {item.sku}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-amber-500";
