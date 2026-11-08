import type { BinDetail } from "../api/types";

export function BinInventoryPrintBlock({
  bin,
  pageBreakAfter = true,
}: {
  bin: BinDetail;
  pageBreakAfter?: boolean;
}) {
  return (
    <section
      className={`bin-inventory-block text-black ${pageBreakAfter ? "bin-inventory-page-break" : ""}`}
    >
      <header className="border-b-2 border-black pb-2">
        <p className="font-mono text-sm font-semibold">{bin.id}</p>
        <h1 className="text-xl font-bold">{bin.name}</h1>
        {bin.location_notes && (
          <p className="mt-1 text-sm text-slate-700">{bin.location_notes}</p>
        )}
      </header>

      {bin.contents.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">No items counted in this bin.</p>
      ) : (
        <table className="inventory-table mt-4 w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-400">
              <th className="py-2 pr-4 font-semibold">Item</th>
              <th className="py-2 pr-4 font-semibold">Category</th>
              <th className="py-2 text-right font-semibold tabular-nums">Qty</th>
            </tr>
          </thead>
          <tbody>
            {bin.contents
              .slice()
              .sort((a, b) => a.item.name.localeCompare(b.item.name))
              .map((row) => (
                <tr key={row.item.id} className="border-b border-slate-200">
                  <td className="py-2 pr-4">{row.item.name}</td>
                  <td className="py-2 pr-4 text-slate-700">{row.item.category}</td>
                  <td className="py-2 text-right font-semibold tabular-nums">
                    {row.quantity}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      <p className="mt-4 text-[10px] text-slate-500">
        {bin.contents.length} line item{bin.contents.length === 1 ? "" : "s"} ·
        Printed from StashIQ
      </p>
    </section>
  );
}
