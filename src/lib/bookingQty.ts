/** Hint untuk helper text input qty (selaras pesan validasi backend). */
export const BOOKING_QTY_DECIMAL_HINT =
  'Gunakan titik (.) atau koma (,) sebagai pemisah desimal (mis. 2,5 atau 1.25).';

export const BOOKING_QTY_MIN = 0.0001;
export const BOOKING_QTY_MAX = 99999;

/** Parsing qty dari input teks (titik/koma → angka). */
export function parseBookingQuantityInput(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, '').replace(/,/g, '.');
  if (t === '' || t === '.' || t === '-' || t === '+.') return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < BOOKING_QTY_MIN || n > BOOKING_QTY_MAX) return null;
  return Math.round(n * 10000) / 10000;
}

/** Selaras `lineQtyEffective` backend: subtotal, ringkasan, stok tampilan. */
export function effectiveBookingLineQty(q: unknown): number {
  const n = typeof q === 'number' ? q : Number(q);
  if (!Number.isFinite(n) || n < BOOKING_QTY_MIN) return 1;
  const capped = Math.min(BOOKING_QTY_MAX, n);
  return Math.round(capped * 10000) / 10000;
}

export function clampBookingQtyParsedOrFallback(raw: number | null | undefined, fallback: number): number {
  if (raw == null || !Number.isFinite(raw)) return effectiveBookingLineQty(fallback);
  return effectiveBookingLineQty(raw);
}

export function formatBookingQtyDisplay(q: number): string {
  return effectiveBookingLineQty(q).toLocaleString('id-ID', { maximumFractionDigits: 4 });
}
