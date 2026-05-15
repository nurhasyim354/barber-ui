export type StaffDowKey =
  | 'mon'
  | 'tue'
  | 'wed'
  | 'thu'
  | 'fri'
  | 'sat'
  | 'sun';

export type DayWindows = { start: string; end: string };

export type StaffAvailabilityMap = Partial<Record<StaffDowKey, DayWindows[]>>;

export type AppointmentSlotOption = { start: string; end: string; label: string };

const HM = /^(\d{1,2})[.:](\d{2})$/;

export function normalizeHm(raw: string): string | null {
  const s = String(raw ?? '').trim();
  const m = HM.exec(s.replace('.', ':'));
  if (!m) return null;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function hmToMinutes(hm: string): number | null {
  const n = normalizeHm(hm);
  if (!n) return null;
  const [h, mm] = n.split(':').map((x) => parseInt(x, 10));
  return h * 60 + mm;
}

function slotRange(slot: DayWindows): { a: number; b: number } | null {
  const s = hmToMinutes(slot.start);
  let e = hmToMinutes(slot.end);
  if (s == null || e == null) return null;
  if (String(slot.end).trim() === '24:00' || String(slot.end).trim() === '24.00') e = 24 * 60;
  if (e <= s) return null;
  return { a: s, b: e };
}

export function appointmentIntervalsOverlap(x: DayWindows, y: DayWindows): boolean {
  const rx = slotRange(x);
  const ry = slotRange(y);
  if (!rx || !ry) return false;
  return rx.a < ry.b && ry.a < rx.b;
}

export function formatAppointmentSlotLabel(slot: Pick<DayWindows, 'start' | 'end'>): string {
  const a = normalizeHm(slot.start) ?? slot.start;
  const b = normalizeHm(slot.end) ?? slot.end;
  return `Mulai ${a} · Selesai ${b}`;
}

export function addCalendarDaysToDayKey(dayKey: string, add: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dayKey).trim());
  if (!m) return dayKey;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  const x = new Date(y, mo - 1, d);
  x.setDate(x.getDate() + add);
  const yy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, '0');
  const dd = String(x.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export type StaffQueueLike = {
  availabilityDaysHours?: StaffAvailabilityMap | null;
  selectedBookingDowKey?: string;
  bookedAppointmentSlots?: DayWindows[];
  canBookOnSelectedDay?: boolean;
};

/**
 * Satu opsi per jendela jadwal: interval = jendela penuh. Menyaring yang tabrakan dengan `bookedAppointmentSlots`.
 */
export function buildAppointmentSlotOptions(row: StaffQueueLike | null): AppointmentSlotOption[] {
  if (!row || row.canBookOnSelectedDay === false) return [];
  const dow = String(row.selectedBookingDowKey ?? '') as StaffDowKey;
  const sched = row.availabilityDaysHours;
  let windows: DayWindows[] =
    sched && typeof sched === 'object' && Array.isArray(sched[dow]) ? (sched[dow] as DayWindows[]) : [];

  if (!windows.length) {
    windows = [{ start: '09:00', end: '17:00' }];
  }

  const booked = Array.isArray(row.bookedAppointmentSlots) ? row.bookedAppointmentSlots : [];

  const out: AppointmentSlotOption[] = [];
  for (const w of windows) {
    const start = normalizeHm(w.start);
    const end = normalizeHm(w.end);
    if (!start || !end || !slotRange({ start, end })) continue;
    const slot = { start, end };
    const clashes = booked.some((b) => appointmentIntervalsOverlap(slot, b));
    if (clashes) continue;
    out.push({
      start,
      end,
      label: formatAppointmentSlotLabel({ start, end }),
    });
  }
  return out;
}
