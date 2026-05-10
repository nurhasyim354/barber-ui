/**
 * Format menit menjadi teks yang mudah dibaca.
 *
 * Contoh:
 *   5       → "5 mnt"
 *   45      → "45 mnt"
 *   60      → "1 jam"
 *   90      → "1 j 30 mnt"
 *   120     → "2 jam"
 *   1440    → "~1 hari"
 *   1500    → "~1 hari 1 jam"
 *   2880    → "~2 hari"
 *   2940    → "~2 hari 1 jam"
 */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '—';

  const MINS_PER_DAY = 1440;
  const MINS_PER_HOUR = 60;

  if (minutes >= MINS_PER_DAY) {
    const days = Math.floor(minutes / MINS_PER_DAY);
    const rem = minutes % MINS_PER_DAY;
    const hours = Math.floor(rem / MINS_PER_HOUR);
    const parts = [`~${days} hari`];
    if (hours > 0) parts.push(`${hours} jam`);
    return parts.join(' ');
  }

  if (minutes >= MINS_PER_HOUR) {
    const hours = Math.floor(minutes / MINS_PER_HOUR);
    const rem = minutes % MINS_PER_HOUR;
    if (rem === 0) return `${hours} jam`;
    return `${hours} j ${rem} mnt`;
  }

  return `${minutes} mnt`;
}
