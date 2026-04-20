/**
 * Konten panduan produk (landing /tutorial) — selaras fitur di CONTEXT.md & route barber-ui.
 */

export type TutorialAudience = 'pelanggan' | 'admin_outlet' | 'staff' | 'platform';

export type TutorialSlug =
  | 'booking-dan-antrian'
  | 'riwayat-pelanggan'
  | 'dashboard-dan-operasional'
  | 'qr-booking-outlet'
  | 'kasir-pos'
  | 'laporan-outlet'
  | 'pengaturan-outlet'
  | 'langganan-tenant'
  | 'antrian-staff'
  | 'admin-platform';

export interface TutorialSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface TutorialPageDef {
  slug: TutorialSlug;
  title: string;
  lead: string;
  audience: TutorialAudience;
  readMinutes: number;
  sections: TutorialSection[];
}

const AUDIENCE_LABEL: Record<TutorialAudience, string> = {
  pelanggan: 'Pelanggan',
  admin_outlet: 'Admin outlet',
  staff: 'Staff / tenaga layanan',
  platform: 'Admin platform',
};

export function audienceLabel(a: TutorialAudience): string {
  return AUDIENCE_LABEL[a];
}

export const TUTORIAL_PAGES: TutorialPageDef[] = [
  {
    slug: 'booking-dan-antrian',
    title: 'Booking & antrian (pelanggan)',
    lead:
      'Cara memesan dari HP: lewat QR di outlet, link booking, atau langsung ke halaman booking setelah login.',
    audience: 'pelanggan',
    readMinutes: 4,
    sections: [
      {
        heading: 'Mulai dari QR atau link',
        paragraphs: [
          'Scan QR yang dipajang outlet atau buka link yang dibagikan admin. Anda akan diarahkan ke halaman booking dengan outlet yang sudah terpilih.',
          'Jika belum punya akun, masukkan nama dan nomor HP, lalu verifikasi kode OTP yang dikirim ke WhatsApp.',
        ],
        bullets: [
          'Parameter `tenantId` di URL menentukan outlet mana yang dipakai.',
          'Admin bisa membuat QR khusus yang sudah berisi nomor HP Anda (form lebih cepat terisi).',
        ],
      },
      {
        heading: 'Pilih layanan & staff',
        paragraphs: [
          'Pilih satu atau beberapa layanan dari daftar harga dan durasi outlet.',
          'Langkah berikutnya: pilih barber/staff tertentu, atau pilih opsi tanpa preferensi agar outlet menugaskan.',
        ],
      },
      {
        heading: 'Setelah booking',
        paragraphs: [
          'Anda mendapat nomor antrian dan status menunggu. Pantau dari halaman booking yang sama.',
          'Jika Anda pernah ke beberapa outlet, bisa memilih outlet aktif lewat dialog “Pilih outlet”.',
        ],
      },
    ],
  },
  {
    slug: 'riwayat-pelanggan',
    title: 'Riwayat kunjungan & pengingat',
    lead: 'Ringkasan booking lalu, foto dokumentasi hasil layanan terakhir, dan pengingat jadwal booking lagi.',
    audience: 'pelanggan',
    readMinutes: 3,
    sections: [
      {
        heading: 'Menu Riwayat',
        paragraphs: [
          'Buka menu riwayat dari navigasi bawah pelanggan untuk melihat daftar kunjungan: menunggu, selesai, atau dibatalkan.',
        ],
      },
      {
        heading: 'Di halaman booking',
        paragraphs: [
          'Setelah ada kunjungan selesai, outlet dapat menampilkan ringkasan kunjungan terakhir dan foto hasil layanan (jika diunggah staff).',
          'Jika outlet mengaktifkan pengingat, Anda dapat melihat informasi bahwa sistem akan mengingatkan via WhatsApp setelah jumlah hari tertentu sejak layanan selesai.',
        ],
      },
    ],
  },
  {
    slug: 'dashboard-dan-operasional',
    title: 'Dashboard & operasional outlet',
    lead:
      'Ringkasan untuk admin outlet: layanan, staff, pelanggan, dan alur harian — dari satu panel setelah login.',
    audience: 'admin_outlet',
    readMinutes: 5,
    sections: [
      {
        heading: 'Dashboard',
        paragraphs: [
          'Setelah masuk sebagai admin outlet, buka Dashboard untuk gambaran singkat aktivitas dan pintasan ke fitur utama.',
        ],
      },
      {
        heading: 'Layanan',
        paragraphs: [
          'Kelola daftar layanan: nama, deskripsi, harga, durasi, dan status aktif/nonaktif. Hanya layanan aktif yang umumnya tampil ke pelanggan.',
        ],
      },
      {
        heading: 'Staff (barber)',
        paragraphs: [
          'Tambah atau edit profil tenaga layanan, foto, dan status aktif. Staff dapat login sendiri lewat OTP untuk mengelola antrian mereka.',
        ],
      },
      {
        heading: 'Pelanggan',
        paragraphs: [
          'Lihat daftar pelanggan yang pernah terhubung ke outlet, dengan pencarian untuk menemukan nomor atau nama cepat.',
        ],
      },
    ],
  },
  {
    slug: 'qr-booking-outlet',
    title: 'QR & link booking outlet',
    lead: 'Bagikan QR atau link agar pelanggan langsung booking ke outlet Anda tanpa salah cabang.',
    audience: 'admin_outlet',
    readMinutes: 2,
    sections: [
      {
        heading: 'Halaman QR booking',
        paragraphs: [
          'Dari menu terkait QR booking, tampilkan kode QR di layar untuk di-scan pelanggan, atau salin URL lengkapnya.',
          'Nama outlet ditampilkan di halaman agar pelanggan yakin scan ke tempat yang benar.',
        ],
        bullets: [
          'Opsional: isi nomor HP pelanggan agar saat scan form booking sudah terisi nomor mereka.',
          'Unduh QR sebagai file gambar untuk dicetak atau dipajang.',
        ],
      },
    ],
  },
  {
    slug: 'kasir-pos',
    title: 'Kasir (POS)',
    lead: 'Alur kasir: pilih booking, update status layanan, terima pembayaran tunai atau QRIS, dan cetak nota.',
    audience: 'admin_outlet',
    readMinutes: 4,
    sections: [
      {
        heading: 'Antrian di kasir',
        paragraphs: [
          'Halaman POS menampilkan booking hari ini. Urutkan atau filter sesuai kebutuhan operasional outlet.',
        ],
      },
      {
        heading: 'Status & pembayaran',
        paragraphs: [
          'Perbarui status dari menunggu → sedang dilayani → selesai sesuai proses nyata.',
          'Catat pembayaran: tunai atau QRIS. Gambar QRIS outlet dapat dikonfigurasi di pengaturan untuk ditampilkan ke pelanggan.',
        ],
      },
    ],
  },
  {
    slug: 'laporan-outlet',
    title: 'Laporan outlet',
    lead: 'Agregasi pendapatan dan aktivitas untuk kebutuhan evaluasi harian atau periode tertentu.',
    audience: 'admin_outlet',
    readMinutes: 3,
    sections: [
      {
        heading: 'Laporan tenant',
        paragraphs: [
          'Buka menu laporan untuk melihat ringkasan yang dihitung dari data booking dan pembayaran di outlet Anda.',
          'Gunakan rentang tanggal yang sesuai untuk rekonsiliasi kas atau evaluasi kinerja.',
        ],
      },
    ],
  },
  {
    slug: 'pengaturan-outlet',
    title: 'Pengaturan outlet',
    lead: 'Identitas outlet, tema tampilan, QRIS, lokasi, dan pengingat pelanggan kembali booking.',
    audience: 'admin_outlet',
    readMinutes: 3,
    sections: [
      {
        heading: 'Data & branding',
        paragraphs: [
          'Perbarui nama, alamat, telepon, dan preferensi warna tema agar aplikasi pelanggan selaras brand outlet.',
        ],
      },
      {
        heading: 'Pembayaran & retensi',
        paragraphs: [
          'Unggah atau perbarui gambar QRIS untuk pembayaran non-tunai.',
          'Atur hari pengingat WhatsApp setelah kunjungan selesai (atau nonaktifkan jika tidak dipakai).',
        ],
      },
    ],
  },
  {
    slug: 'langganan-tenant',
    title: 'Langganan SaaS outlet',
    lead: 'Paket berlangganan platform, tagihan bulanan, dan status keanggotaan tenant Anda.',
    audience: 'admin_outlet',
    readMinutes: 2,
    sections: [
      {
        heading: 'Menu langganan',
        paragraphs: [
          'Admin outlet dapat melihat paket yang berlaku, riwayat tagihan, dan informasi billing terkait penggunaan platform.',
          'Detail pasti mengikuti kebijakan operator platform Anda.',
        ],
      },
    ],
  },
  {
    slug: 'antrian-staff',
    title: 'Antrian untuk staff',
    lead: 'Staff login lewat OTP, melihat antrian hari ini, mengubah ketersediaan, dan menyelesaikan layanan.',
    audience: 'staff',
    readMinutes: 3,
    sections: [
      {
        heading: 'Login & antrian',
        paragraphs: [
          'Masuk dengan nomor HP yang terhubung ke profil staff. Anda melihat booking yang menunggu atau sedang ditangani.',
        ],
      },
      {
        heading: 'Riwayat staff',
        paragraphs: [
          'Menu riwayat khusus staff menampilkan pekerjaan yang sudah selesai untuk referensi pribadi.',
        ],
        bullets: [
          'Upload foto hasil layanan (jika diizinkan alur outlet) dapat terhubung ke booking selesai.',
        ],
      },
    ],
  },
  {
    slug: 'admin-platform',
    title: 'Admin platform (multi-tenant)',
    lead: 'Untuk tim internal operator: kelola semua tenant, paket langganan, tagihan, dan laporan agregat.',
    audience: 'platform',
    readMinutes: 4,
    sections: [
      {
        heading: 'Tenant',
        paragraphs: [
          'Daftar tenant/outlet: aktifkan, nonaktifkan, atau drill-down ke detail satu tenant untuk dukungan.',
        ],
      },
      {
        heading: 'Langganan & paket',
        paragraphs: [
          'Konfigurasi paket langganan (misalnya free/basic/advanced) dan pantau status billing per tenant.',
        ],
      },
      {
        heading: 'Laporan agregat',
        paragraphs: [
          'Laporan level platform membantu memantau performa seluruh jaringan outlet dalam rentang waktu tertentu.',
        ],
      },
    ],
  },
];

export const TUTORIAL_BY_SLUG: Record<TutorialSlug, TutorialPageDef> = TUTORIAL_PAGES.reduce(
  (acc, p) => {
    acc[p.slug] = p;
    return acc;
  },
  {} as Record<TutorialSlug, TutorialPageDef>,
);

export const TUTORIAL_SLUGS: TutorialSlug[] = TUTORIAL_PAGES.map((p) => p.slug);

export function isTutorialSlug(s: string): s is TutorialSlug {
  return (TUTORIAL_SLUGS as string[]).includes(s);
}
