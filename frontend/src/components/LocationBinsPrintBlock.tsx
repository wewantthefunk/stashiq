import type { Location, BinSummary } from "../api/types";

type Props = {
  location: Location | null;
  bins: BinSummary[];
  pageBreakAfter: boolean;
};

export function LocationBinsPrintBlock({
  location,
  bins,
  pageBreakAfter,
}: Props) {
  const title = location?.name ?? "Unassigned bins";
  const subtitle = location
    ? `${location.id} · ${location.address}`
    : "Bins with no location set";

  return (
    <section
      className={`location-bins-block text-black ${
        pageBreakAfter ? "location-bins-page-break" : ""
      }`}
    >
      <header className="mb-4 border-b border-slate-300 pb-3">
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
      </header>
      {bins.length === 0 ? (
        <p className="text-sm text-slate-500">No bins at this location.</p>
      ) : (
        <ul className="space-y-2">
          {bins.map((bin) => (
            <li
              key={bin.id}
              className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-2 text-sm"
            >
              <span className="font-medium">{bin.name}</span>
              <span className="shrink-0 font-mono text-slate-600">{bin.id}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
