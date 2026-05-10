import { effectiveBookingLineQty } from './bookingQty';

/** Bentuk layanan di respons API booking hari ini / riwayat (multi-layanan). */
export type UiBookingServiceLine = {
  serviceId?: string;
  serviceName: string;
  unitPrice: number;
  quantity: number;
  /** Satuan snapshot dari katalog (kg, pcs, …); opsional. */
  unit?: string | null;
  lineSubtotal?: number;
};

export type UiBooking = {
  _id: string;
  customerName: string;
  customerId?: string;
  services?: UiBookingServiceLine[];
  totalSubtotal?: number;
  summaryServiceLabel?: string;
  /** @deprecated hanya data lama */
  serviceName?: string;
  servicePrice?: number;
  /** getToday: nominal dibayar untuk booking selesai */
  paidAmount?: number;
  queueNumber: number;
  status: string;
  notes?: string;
  staffId?: string;
  staffName?: string;
  /** Posisi (1…N); hadir saat outlet mengaktifkan pemilihan posisi di booking */
  seatPosition?: number | null;
  date: string;
};

export function bookingServicesLabel(
  b: Pick<UiBooking, 'summaryServiceLabel' | 'serviceName' | 'services'>,
): string {
  if (b.summaryServiceLabel) return b.summaryServiceLabel;
  if (b.serviceName) return b.serviceName;
  if (b.services?.length) return b.services.map((l) => l.serviceName).join(', ');
  return 'Layanan';
}

export function bookingSubtotalOrLegacy(
  b: Pick<UiBooking, 'totalSubtotal' | 'servicePrice'>,
): number {
  if (b.totalSubtotal != null && Number.isFinite(b.totalSubtotal)) return b.totalSubtotal;
  if (b.servicePrice != null && Number.isFinite(b.servicePrice)) return b.servicePrice;
  return 0;
}

export function formatRpId(n: number): string {
  return n.toLocaleString('id-ID');
}

/** Tanggal booking / kunjungan (di samping nomor antrian di UI & nota). */
export function formatBookingQueueDate(iso: string | undefined | null): string {
  if (iso == null || String(iso).trim() === '') return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  return new Date(iso).toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Baris rincian nota pembayaran: nama, harga satuan, qty, subtotal. */
export type ReceiptServiceLine = {
  name: string;
  unitPrice: number;
  qty: number;
  subtotal: number;
  unit?: string | null;
};

/**
 * Dari `services[]` booking; bila kosong, satu baris fallback (data lama / ringkas).
 */
export function getReceiptServiceLines(
  b: Pick<UiBooking, 'services' | 'serviceName' | 'servicePrice' | 'totalSubtotal'>,
): ReceiptServiceLine[] {
  if (b.services && b.services.length > 0) {
    return b.services.map((line) => {
      const q = effectiveBookingLineQty(line.quantity);
      const sub =
        line.lineSubtotal != null && Number.isFinite(line.lineSubtotal)
          ? line.lineSubtotal
          : Math.round(line.unitPrice * q);
      return {
        name: line.serviceName,
        unitPrice: line.unitPrice,
        qty: q,
        subtotal: sub,
        ...(line.unit != null && String(line.unit).trim() !== '' ? { unit: line.unit } : {}),
      };
    });
  }
  const tot = bookingSubtotalOrLegacy(b);
  if (b.serviceName) {
    return [{ name: b.serviceName, unitPrice: tot, qty: 1, subtotal: tot }];
  }
  return [];
}
