export function isFirefox(): boolean {
  if (typeof navigator === "undefined") return false;
  return /firefox/i.test(navigator.userAgent);
}
