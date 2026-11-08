/** Extract a bin id from a StashIQ QR payload (URL or plain id). */
export function parseBinIdFromScan(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;

  try {
    const url = new URL(text);
    const match = url.pathname.match(/\/bins\/([^/]+)\/?$/i);
    if (match) return decodeURIComponent(match[1]);
  } catch {
    // not a URL
  }

  if (/^[A-Za-z0-9_-]{1,32}$/.test(text)) {
    return text;
  }

  return null;
}
