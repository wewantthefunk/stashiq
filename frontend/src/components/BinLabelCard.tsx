import { labelScanDisplay } from "../lib/labelScanDisplay";

export function BinLabelCard({
  binId,
  name,
  qrUrl,
  scanUrl,
  className = "",
}: {
  binId: string;
  name: string;
  qrUrl: string;
  scanUrl: string;
  className?: string;
}) {
  const scanLine = labelScanDisplay(scanUrl, binId);

  return (
    <article
      className={`label-card flex max-h-full flex-col items-center overflow-hidden bg-white p-4 text-center text-black ${className}`}
    >
      <p className="label-card-brand text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
        StashIQ · Amazing Athletes
      </p>
      <p className="label-card-id mt-2 font-mono text-3xl font-bold leading-none">
        {binId}
      </p>
      <h1 className="label-card-name mt-2 line-clamp-2 text-lg font-semibold leading-tight">
        {name}
      </h1>
      <img
        src={qrUrl}
        alt={`QR code for bin ${binId}`}
        className="label-card-qr mt-3 h-[1.85in] w-[1.85in] object-contain"
      />
      <p className="label-card-url mt-2 max-w-full text-[9px] leading-snug text-slate-600">
        {scanLine}
      </p>
    </article>
  );
}
