/** Format durasi layanan (menit) untuk chip / ringkasan booking. */
export function formatDuration(totalMinutes: number | null | undefined): string {
  const raw = Number(totalMinutes);
  if (!Number.isFinite(raw) || raw <= 0) return '—';
  const n = Math.round(raw);
  if (n < 60) return `${n} menit`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (m === 0) return `${h} jam`;
  return `${h} jam ${m} menit`;
}
