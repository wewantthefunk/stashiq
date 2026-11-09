/**
 * Short URL line for QR stickers — long production hostnames were wrapping
 * and growing past half a letter page (breaking 2-up print layout).
 */
export function labelScanDisplay(scanUrl: string, binId: string): string {
  try {
    const u = new URL(scanUrl);
    return `Scan · ${u.host}/bins/${binId}`;
  } catch {
    const tail = scanUrl.length > 48 ? `${scanUrl.slice(0, 45)}…` : scanUrl;
    return `Scan for inventory · ${tail}`;
  }
}
