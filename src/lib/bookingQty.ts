/** Qty minimal yang valid per baris layanan (mendukung pecahan, mis. kg). */
export const BOOKING_QTY_MIN = 0.001;

export const BOOKING_QTY_DECIMAL_HINT =
  'Masukkan angka positif; gunakan titik atau koma untuk pecahan (mis. 2,5).';

function clampToMin(n: number): number {
  if (!Number.isFinite(n)) return BOOKING_QTY_MIN;
  return n < BOOKING_QTY_MIN ? BOOKING_QTY_MIN : n;
}

/** Normalisasi qty dari API/state; tidak valid → 1 (perilaku lama satu layanan). */
export function effectiveBookingLineQty(q: unknown): number {
  const n = typeof q === 'number' ? q : Number(q);
  if (!Number.isFinite(n) || n < BOOKING_QTY_MIN) return 1;
  return n;
}

/** Tampilan qty untuk input ringkas / ringkasan (locale id-ID). */
export function formatBookingQtyDisplay(q: number): string {
  if (!Number.isFinite(q)) return '1';
  const rounded = Math.round(q * 1e6) / 1e6;
  return rounded.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });
}

/**
 * Parse teks qty dari pengguna. Mendukung koma atau titik sebagai pemisah desimal.
 */
export function parseBookingQuantityInput(raw: string): number | null {
  const t = raw.trim().replace(/\s+/g, '');
  if (t === '') return null;
  const normalized = t.replace(',', '.');
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < BOOKING_QTY_MIN) return null;
  return n;
}

export function clampBookingQtyParsedOrFallback(
  parsed: number | null | undefined,
  fallback: number,
): number {
  const fb = effectiveBookingLineQty(fallback);
  if (parsed == null || !Number.isFinite(parsed)) return fb;
  return clampToMin(parsed);
}
