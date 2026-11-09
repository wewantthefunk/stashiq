/** Split items into rows of two — one printed sheet per pair. */
export function chunkPairs<T>(items: T[]): T[][] {
  const sheets: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    sheets.push(items.slice(i, i + 2));
  }
  return sheets;
}
