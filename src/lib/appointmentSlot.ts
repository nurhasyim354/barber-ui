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

export function formatSlotRangeLabel(slot: { start: string; end: string }): string {
  const a = normalizeHm(slot.start) ?? slot.start;
  const b = normalizeHm(slot.end) ?? slot.end;
  return `${a} – ${b}`;
}
