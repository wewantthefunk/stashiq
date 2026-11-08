import { useEffect, useState } from "react";

import { getPublicConfig } from "../../api/client";
import type { PublicConfig } from "../../api/types";

export function MobileAccessPanel() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function load() {
      try {
        const data = await getPublicConfig();
        if (cancelled) return;
        setConfig(data);
        const response = await fetch("/api/config/access-qr");
        if (!response.ok) throw new Error("QR failed");
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setQrUrl(objectUrl);
      } catch {
        if (!cancelled) setError("Could not load network info.");
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  async function copyUrl() {
    if (!config?.phone_url) return;
    try {
      await navigator.clipboard.writeText(config.phone_url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  if (error) {
    return <p className="text-sm text-red-300">{error}</p>;
  }

  if (!config) {
    return <p className="text-sm text-slate-500">Loading network info…</p>;
  }

  const isLocalhost =
    config.phone_url.includes("localhost") ||
    config.phone_url.includes("127.0.0.1");

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Start the stack with{" "}
        <code className="text-slate-300">./scripts/compose-up.sh up --build</code>{" "}
        so the LAN IP is detected automatically when your network changes.
      </p>

      {isLocalhost && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          <code>FRONTEND_BASE_URL</code> is still localhost — phones cannot use
          that. Run{" "}
          <code className="text-amber-50">./scripts/compose-up.sh up -d</code>{" "}
          on the host, or set <code>FRONTEND_BASE_URL</code> in{" "}
          <code>.env</code> to{" "}
          <code>http://&lt;your-lan-ip&gt;:3000</code>.
        </p>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          On your phone (same Wi‑Fi)
        </p>
        {config.public_url_configured && (
          <p className="mt-2 text-xs text-slate-400">
            Public site (QR codes):{" "}
            <span className="font-mono text-amber-300">{config.public_url}</span>
          </p>
        )}
        <p className="mt-2 break-all font-mono text-lg text-amber-300">
          {config.phone_url}
        </p>
        {config.lan_ip && (
          <p className="mt-1 text-xs text-slate-500">
            Detected LAN IP: {config.lan_ip}
          </p>
        )}
        <button
          type="button"
          onClick={() => void copyUrl()}
          className="mt-3 rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>

      <div className="rounded-xl border border-slate-800 bg-white p-4 text-center">
        {qrUrl ? (
          <img
            src={qrUrl}
            alt="QR code to open StashIQ on your phone"
            className="mx-auto h-44 w-44"
          />
        ) : (
          <p className="text-sm text-slate-500">Loading QR…</p>
        )}
        <p className="mt-2 text-xs text-slate-600">
          Scan to open the coach app (not a specific bin).
        </p>
      </div>

      <p className="text-xs text-slate-500">
        Laptop only: {config.localhost_url}. Bin label QR codes use{" "}
        <code className="text-slate-400">{config.frontend_base_url}</code>.
      </p>
    </div>
  );
}
