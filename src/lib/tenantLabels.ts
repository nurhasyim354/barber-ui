/**
 * Label UI per jenis tenant — diselaraskan dengan `tenantType` di API & marketing vertikal.
 */
export const TENANT_TYPES = ['klinik', 'barbershop', 'bengkel_motor', 'spa_kecantikan', 'carwash', 'ppob', 'jasa_umum'] as const;
export type TenantType = (typeof TENANT_TYPES)[number];

export const DEFAULT_TENANT_TYPE: TenantType = 'barbershop';

export function isTenantType(v: string): v is TenantType {
  return (TENANT_TYPES as readonly string[]).includes(v);
}

export function normalizeTenantType(v: unknown): TenantType {
  if (typeof v === 'string' && isTenantType(v)) return v;
  return DEFAULT_TENANT_TYPE;
}

export const TENANT_TYPE_OPTIONS: { value: TenantType; label: string }[] = [
  { value: 'barbershop', label: 'Barbershop / salon' },
  { value: 'klinik', label: 'Klinik / praktik' },
  { value: 'bengkel_motor', label: 'Bengkel motor' },
  { value: 'spa_kecantikan', label: 'Spa & kecantikan' },
  { value: 'carwash', label: 'Carwash & Salon Mobil/Motor' },
  { value: 'ppob', label: 'PPOB, Pulsa & Token' },
  { value: 'jasa_umum', label: 'Studio / jasa umum' },
];

export interface TenantUiLabels {
  /** Nav bawah admin: tab tenaga */
  navStaff: string;
  /** Nav bawah admin: tab katalog */
  navServices: string;
  /** Nav pelanggan: tab utama */
  navCustomerBooking: string;
  /** Nav pelanggan: riwayat */
  navCustomerHistory: string;
  /** Judul halaman booking (authenticated) */
  bookingPageTitle: string;
  /** Judul halaman riwayat pelanggan */
  historyPageTitle: string;
  /** Judul halaman daftar tenaga, mis. "Tim Barber" */
  staffTeamTitle: string;
  /** Satuan orang, mis. "Barber", "Dokter" */
  staffSingular: string;
  /** Label dialog tambah, mis. "Tambah Barber" */
  addStaffTitle: string;
  /** Label dialog edit */
  editStaffTitle: string;
  /** Placeholder spesialisasi */
  specialtyPlaceholder: string;
  /** Placeholder catatan booking pelanggan (opsional) */
  bookingNotesPlaceholder: string;
  /** Label field nama */
  staffNameFieldLabel: string;
  /** Konfirmasi hapus */
  deleteStaffTitle: string;
  /** Receipt / POS: prefix nama penugasan */
  assigneeReceiptLabel: string;
}

const LABELS: Record<TenantType, TenantUiLabels> = {
  barbershop: {
    navStaff: 'Barber',
    navServices: 'Layanan',
    navCustomerBooking: 'Booking',
    navCustomerHistory: 'Riwayat',
    bookingPageTitle: '💈 Booking',
    historyPageTitle: 'Riwayat Layanan',
    staffTeamTitle: 'Tim Barber',
    staffSingular: 'Barber',
    addStaffTitle: 'Tambah Barber',
    editStaffTitle: 'Edit Barber',
    specialtyPlaceholder: 'Contoh: Fade, Undercut, Classic Cut',
    bookingNotesPlaceholder: 'Contoh: potong pendek bagian samping',
    staffNameFieldLabel: 'Nama Barber *',
    deleteStaffTitle: 'Hapus Barber?',
    assigneeReceiptLabel: 'Barber',
  },
  klinik: {
    navStaff: 'Dokter',
    navServices: 'Layanan',
    navCustomerBooking: 'Janji',
    navCustomerHistory: 'Riwayat',
    bookingPageTitle: '🏥 Janji temu',
    historyPageTitle: 'Riwayat Kunjungan',
    staffTeamTitle: 'Tim Dokter',
    staffSingular: 'Dokter',
    addStaffTitle: 'Tambah Dokter',
    editStaffTitle: 'Edit Dokter',
    specialtyPlaceholder: 'Contoh: Umum, Anak, Jantung',
    bookingNotesPlaceholder: 'Contoh: keluhan singkat, alergi obat (jika ada)',
    staffNameFieldLabel: 'Nama Dokter *',
    deleteStaffTitle: 'Hapus Dokter?',
    assigneeReceiptLabel: 'Dokter',
  },
  bengkel_motor: {
    navStaff: 'Mekanik',
    navServices: 'Servis',
    navCustomerBooking: 'Booking',
    navCustomerHistory: 'Riwayat',
    bookingPageTitle: '🔧 Booking servis',
    historyPageTitle: 'Riwayat Servis',
    staffTeamTitle: 'Tim Mekanik',
    staffSingular: 'Mekanik',
    addStaffTitle: 'Tambah Mekanik',
    editStaffTitle: 'Edit Mekanik',
    specialtyPlaceholder: 'Contoh: Tune-up, Listrik, CVT',
    bookingNotesPlaceholder: 'Contoh: suara mesin kasar, oli rembes',
    staffNameFieldLabel: 'Nama Mekanik *',
    deleteStaffTitle: 'Hapus Mekanik?',
    assigneeReceiptLabel: 'Mekanik',
  },
  spa_kecantikan: {
    navStaff: 'Terapis',
    navServices: 'Perawatan',
    navCustomerBooking: 'Reservasi',
    navCustomerHistory: 'Riwayat',
    bookingPageTitle: '✨ Reservasi',
    historyPageTitle: 'Riwayat Perawatan',
    staffTeamTitle: 'Tim Terapis',
    staffSingular: 'Terapis',
    addStaffTitle: 'Tambah Terapis',
    editStaffTitle: 'Edit Terapis',
    specialtyPlaceholder: 'Contoh: Facial, Massage, Hair spa',
    bookingNotesPlaceholder: 'Contoh: tekanan pijat ringan, kulit sensitif',
    staffNameFieldLabel: 'Nama Terapis *',
    deleteStaffTitle: 'Hapus Terapis?',
    assigneeReceiptLabel: 'Terapis',
  },
  carwash: {
    navStaff: 'Staff',
    navServices: 'Layanan',
    navCustomerBooking: 'Booking',
    navCustomerHistory: 'Riwayat',
    bookingPageTitle: '📋 Booking',
    historyPageTitle: 'Riwayat Layanan',
    staffTeamTitle: 'Tim Staff',
    staffSingular: 'Staff',
    addStaffTitle: 'Tambah Staff',
    editStaffTitle: 'Edit Staff',
    specialtyPlaceholder: 'Contoh: Poles, Mekanik, Elektrical',
    bookingNotesPlaceholder: 'Contoh: detail singkat kebutuhan, preferensi jadwal',
    staffNameFieldLabel: 'Nama Staff *',
    deleteStaffTitle: 'Hapus Staff?',
    assigneeReceiptLabel: 'Staff',
  },
  ppob: {
    navStaff: 'Staff',
    navServices: 'Layanan',
    navCustomerBooking: 'Booking',
    navCustomerHistory: 'Riwayat',
    bookingPageTitle: '📋 Booking',
    historyPageTitle: 'Riwayat Layanan',
    staffTeamTitle: 'Tim Staff',
    staffSingular: 'Staff',
    addStaffTitle: 'Tambah Staff',
    editStaffTitle: 'Edit Staff',
    specialtyPlaceholder: 'Contoh: Konsultasi, Editing, Instalasi',
    bookingNotesPlaceholder: 'Contoh: ID Pelanggan, nomor tujuan dll',
    staffNameFieldLabel: 'Nama Staff *',
    deleteStaffTitle: 'Hapus Staff?',
    assigneeReceiptLabel: 'Staff',
  },
  jasa_umum: {
    navStaff: 'Staff',
    navServices: 'Layanan',
    navCustomerBooking: 'Booking',
    navCustomerHistory: 'Riwayat',
    bookingPageTitle: '📋 Booking',
    historyPageTitle: 'Riwayat Layanan',
    staffTeamTitle: 'Tim Staff',
    staffSingular: 'Staff',
    addStaffTitle: 'Tambah Staff',
    editStaffTitle: 'Edit Staff',
    specialtyPlaceholder: 'Contoh: Konsultasi, Editing, Instalasi',
    bookingNotesPlaceholder: 'Contoh: detail singkat kebutuhan, preferensi jadwal',
    staffNameFieldLabel: 'Nama Staff *',
    deleteStaffTitle: 'Hapus Staff?',
    assigneeReceiptLabel: 'Staff',
  },
};

export function getTenantUiLabels(tenantType: unknown): TenantUiLabels {
  return LABELS[normalizeTenantType(tenantType)];
}

/** Status siklus tenant (super admin) */
export type TenantLifecycleStatus = 'menunggu_approval' | 'aktif' | 'tidak_aktif';

export const TENANT_STATUS_OPTIONS: { value: TenantLifecycleStatus; label: string; color: 'default' | 'warning' | 'success' | 'error' }[] = [
  { value: 'menunggu_approval', label: 'Menunggu persetujuan', color: 'warning' },
  { value: 'aktif', label: 'Aktif', color: 'success' },
  { value: 'tidak_aktif', label: 'Tidak aktif', color: 'error' },
];

export function tenantStatusLabel(s: string | undefined): string {
  return TENANT_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s ?? '—';
}
