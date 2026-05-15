/** Logika ringkas selaras dengan `barber-api/src/utils/appointmentSlot.ts` untuk UI. */

const HM = /^(\d{1,2})[.:](\d{2})$/;

export function normalizeHm(raw: string): string | null {
  const s = String(raw ?? '').trim();
  const m = HM.exec(s.replace('.', ':'));
  if (!m) return null;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function hmToMinutes(hm: string): number | null {
  const n = normalizeHm(hm);
  if (!n) return null;
  const [h, mm] = n.split(':').map((x) => parseInt(x, 10));
  return h * 60 + mm;
}

export function slotToMinuteRange(slot: { start: string; end: string }): { a: number; b: number } | null {
  const s = hmToMinutes(slot.start);
  let e = hmToMinutes(slot.end);
  if (s == null) return null;
  if (e == null) return null;
  if (String(slot.end).trim() === '24:00' || String(slot.end).trim() === '24.00') e = 24 * 60;
  if (e <= s) return null;
  return { a: s, b: e };
}

/** Tabrakan interval [start,end) — sama seperti backend. */
export function appointmentIntervalsOverlap(x: { start: string; end: string }, y: { start: string; end: string }): boolean {
  const rx = slotToMinuteRange(x);
  const ry = slotToMinuteRange(y);
  if (!rx || !ry) return false;
  return rx.a < ry.b && ry.a < rx.b;
}

/** `true` jika jendela jadwal bertubrukan dengan salah satu slot yang sudah dibooking. */
export function windowCollidesWithBooked(
  window: { start: string; end: string },
  booked: { start: string; end: string }[],
): boolean {
  return booked.some((b) => appointmentIntervalsOverlap(window, b));
}

export function formatSlotRangeLabel(slot: { start: string; end: string }): string {
  const a = normalizeHm(slot.start) ?? slot.start;
  const b = normalizeHm(slot.end) ?? slot.end;
  return `${a} – ${b}`;
}
