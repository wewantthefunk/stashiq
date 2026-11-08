import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useId, useRef, useState } from "react";

type QrScannerProps = {
  onScan: (decodedText: string) => void;
  onError?: (message: string) => void;
};

export function QrScanner({ onScan, onError }: QrScannerProps) {
  const elementId = useId().replace(/:/g, "");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);
  const [starting, setStarting] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    handledRef.current = false;

    const scanner = new Html5Qrcode(elementId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        (decoded) => {
          if (handledRef.current) return;
          handledRef.current = true;
          onScan(decoded);
        },
        () => {
          /* per-frame miss — ignore */
        },
      )
      .then(() => {
        if (active) setStarting(false);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Could not access the camera";
        if (active) {
          setCameraError(message);
          setStarting(false);
          onError?.(message);
        }
      });

    return () => {
      active = false;
      const instance = scannerRef.current;
      scannerRef.current = null;
      if (!instance) return;
      void instance
        .stop()
        .catch(() => undefined)
        .finally(() => {
          instance.clear();
        });
    };
  }, [elementId, onScan, onError]);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-slate-700 bg-black">
        <div id={elementId} className="min-h-[280px] w-full" />
      </div>
      {starting && (
        <p className="text-center text-sm text-slate-400">Starting camera…</p>
      )}
      {cameraError && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {cameraError}. Allow camera access in your browser, or enter a bin id
          below.
        </p>
      )}
    </div>
  );
}
