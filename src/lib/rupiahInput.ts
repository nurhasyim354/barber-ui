/** Parse input angka murni (digit) jadi rupiah positif, atau null jika tidak valid. */
export function parseRupiahInput(s: string): number | null {
  const d = s.replace(/\D/g, '');
  if (!d) return null;
  const n = parseInt(d, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
