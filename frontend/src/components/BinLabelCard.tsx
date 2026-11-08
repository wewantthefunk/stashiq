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
  return (
    <article
      className={`label-card flex flex-col items-center bg-white p-4 text-center text-black ${className}`}
    >
      <p className="label-card-brand text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
        StashIQ · Amazing Athletes
      </p>
      <p className="label-card-id mt-2 font-mono text-3xl font-bold leading-none">
        {binId}
      </p>
      <h1 className="label-card-name mt-2 text-lg font-semibold leading-tight">
        {name}
      </h1>
      <img
        src={qrUrl}
        alt={`QR code for bin ${binId}`}
        className="label-card-qr mt-3 h-[1.85in] w-[1.85in] object-contain"
      />
      <p className="label-card-url mt-2 max-w-full break-all text-[9px] leading-snug text-slate-600">
        Scan for inventory · {scanUrl}
      </p>
    </article>
  );
}
