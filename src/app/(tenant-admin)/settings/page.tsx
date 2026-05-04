'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, Button, CircularProgress,
  TextField, Divider, IconButton, Chip,
  Accordion, AccordionSummary, AccordionDetails,
  FormControlLabel, Switch,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import QrCodeIcon from '@mui/icons-material/QrCode2';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import toast from 'react-hot-toast';
import { compressImage } from '@/lib/imageUtils';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import AppPageShell from '@/components/layout/AppPageShell';
import PageContainer from '@/components/layout/PageContainer';
import { TenantAdminBottomNav } from '@/components/layout/BottomNav';
import { defaultBrandPalette } from '@/lib/uiStyleConfig';
import PhoneChangeSection from '@/components/account/PhoneChangeSection';
import SwitchOutletControl from '@/components/account/SwitchOutletControl';

interface TenantTheme {
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  paperColor: string;
}

const DEFAULT_THEME: TenantTheme = {
  primaryColor: defaultBrandPalette.primary,
  accentColor: defaultBrandPalette.secondary,
  bgColor: defaultBrandPalette.background,
  paperColor: defaultBrandPalette.paper,
};

interface TenantSettings {
  _id: string;
  name: string;
  address?: string;
  phone?: string;
  location?: { lat: number; lng: number } | null;
  qrisImageBase64?: string | null;
  theme?: TenantTheme | null;
  /** 0 = nonaktif; kosong/null di DB = default server (21) */
  customerReturnReminderDays?: number | null;
  /** Menit sebelum perkiraan dilayani — WA pengingat (0 = nonaktif). Hanya jika ETA > 2 jam. */
  customerAppointmentReminderMinutes?: number | null;
  /** Batas antrian aktif per hari (menunggu + sedang dilayani); null = tidak dibatasi */
  dailyBookingQuota?: number | null;
  /** Jumlah posisi di form booking (1–50); null = pemilihan posisi tidak dipakai */
  bookingSeatCount?: number | null;
  /** Halaman /booking: tampil field qty per layanan */
  showBookingQty?: boolean | null;
  /** Izinkan akun staff (`staff`) membuat booking lewat API */
  allowStaffCreateBooking?: boolean | null;
  /** true = halaman booking pelanggan (QR) wajib OTP; false/tidak ada = boleh tamu (nama wajib, HP opsional). */
  requireLoginOnCreateBooking?: boolean | null;
}

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

export default function SettingsPage() {
  const { user, isLoading, loadFromStorage } = useAuthStore();
  const pendingLoginPhone = useAuthStore((s) => s.user?.pendingPhone);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tenant, setTenant] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    gpsLat: '',
    gpsLng: '',
  });

  // qrisImageBase64 state: null = unchanged/loading, '' = explicitly removed, 'data:...' = new or existing
  const [qrisImage, setQrisImage] = useState<string | null>(null);
  const [qrisUploading, setQrisUploading] = useState(false);
  const [theme, setTheme] = useState<TenantTheme>(DEFAULT_THEME);
  const [customerReturnReminderDays, setCustomerReturnReminderDays] = useState(21);
  const [customerAppointmentReminderMinutes, setCustomerAppointmentReminderMinutes] = useState(0);
  /** string kosong = tidak dibatasi */
  const [dailyBookingQuota, setDailyBookingQuota] = useState('');
  const [bookingSeatCount, setBookingSeatCount] = useState('');
  const [showBookingQty, setShowBookingQty] = useState(false);
  const [allowStaffCreateBooking, setAllowStaffCreateBooking] = useState(false);
  const [requireLoginOnCreateBooking, setRequireLoginOnCreateBooking] = useState(false);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  const tenantId = user?.tenantId;
  const role = user?.role;

  /** Hanya bergantung pada tenantId — jangan memuat ulang saat profil user berubah (mis. setelah /auth/me di PhoneChangeSection). */
  const loadTenant = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      // /settings endpoint returns full data including qrisImageBase64
      const res = await api.get(`/tenants/${tenantId}/settings`);
      const t: TenantSettings = res.data;
      setTenant(t);
      setForm({
        name: t.name || '',
        address: t.address || '',
        phone: t.phone || '',
        gpsLat: t.location?.lat != null ? String(t.location.lat) : '',
        gpsLng: t.location?.lng != null ? String(t.location.lng) : '',
      });
      setQrisImage(t.qrisImageBase64 || '');
      setTheme(t.theme ?? DEFAULT_THEME);
      const rd = t.customerReturnReminderDays;
      if (rd === 0) setCustomerReturnReminderDays(0);
      else if (rd == null || Number.isNaN(Number(rd))) setCustomerReturnReminderDays(0);
      else setCustomerReturnReminderDays(Math.min(90, Math.max(1, Number(rd))));
      const am = t.customerAppointmentReminderMinutes;
      if (am == null || Number.isNaN(Number(am))) setCustomerAppointmentReminderMinutes(0);
      else setCustomerAppointmentReminderMinutes(Math.min(180, Math.max(0, Number(am))));
      const dq = t.dailyBookingQuota;
      if (dq == null || dq <= 0 || Number.isNaN(Number(dq))) setDailyBookingQuota('');
      else setDailyBookingQuota(String(Math.min(9999, Math.max(1, Math.floor(Number(dq))))));
      const bsc = t.bookingSeatCount;
      if (bsc == null || bsc < 1 || Number.isNaN(Number(bsc))) setBookingSeatCount('');
      else setBookingSeatCount(String(Math.min(50, Math.max(1, Math.floor(Number(bsc))))));
      setShowBookingQty(t.showBookingQty === true);
      setAllowStaffCreateBooking(t.allowStaffCreateBooking === true);
      setRequireLoginOnCreateBooking(t.requireLoginOnCreateBooking === true);
    } catch {
      toast.error('Gagal memuat data tenant');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'tenant_admin') { router.replace('/dashboard'); return; }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (isLoading) return;
    if (role !== 'tenant_admin' || !tenantId) return;
    void loadTenant();
  }, [isLoading, role, tenantId, loadTenant]);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nama Tenant wajib diisi'); return; }

    const lat = form.gpsLat ? parseFloat(form.gpsLat) : null;
    const lng = form.gpsLng ? parseFloat(form.gpsLng) : null;

    if ((form.gpsLat && isNaN(lat!)) || (form.gpsLng && isNaN(lng!))) {
      toast.error('Format koordinat GPS tidak valid');
      return;
    }

    setSaving(true);
    try {
      await api.patch(`/tenants/${user!.tenantId}`, {
        name: form.name,
        address: form.address,
        phone: form.phone,
        gpsLat: lat,
        gpsLng: lng,
        qrisImageBase64: qrisImage ?? undefined,
        theme,
        customerReturnReminderDays,
        customerAppointmentReminderMinutes,
        dailyBookingQuota: dailyBookingQuota.trim() === '' ? null : Math.min(9999, Math.max(1, parseInt(dailyBookingQuota, 10) || 1)),
        bookingSeatCount: bookingSeatCount.trim() === '' ? null : Math.min(50, Math.max(1, parseInt(bookingSeatCount, 10) || 1)),
        showBookingQty,
        allowStaffCreateBooking,
        requireLoginOnCreateBooking,
      });
      toast.success('Pengaturan berhasil disimpan');
      loadTenant();
    } catch {
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  const handleQrisFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (JPG, PNG, dst.)');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error('Ukuran gambar maksimal 2 MB');
      return;
    }

    setQrisUploading(true);
    try {
      const base64 = await compressImage(file);
      setQrisImage(base64);
      toast.success('Gambar QRIS siap — klik Simpan untuk menyimpan');
    } catch {
      toast.error('Gagal memproses gambar');
    } finally {
      setQrisUploading(false);
    }

    // reset input agar file yang sama bisa dipilih ulang
    e.target.value = '';
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Browser tidak mendukung GPS');
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          gpsLat: String(pos.coords.latitude),
          gpsLng: String(pos.coords.longitude),
        }));
        setDetecting(false);
        toast.success('Lokasi berhasil dideteksi');
      },
      (err) => {
        setDetecting(false);
        toast.error('Gagal deteksi lokasi: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const mapsUrl =
    form.gpsLat && form.gpsLng
      ? `https://maps.google.com/?q=${form.gpsLat},${form.gpsLng}`
      : null;

  const copyMapsLink = () => {
    if (mapsUrl) {
      navigator.clipboard.writeText(mapsUrl);
      toast.success('Link Maps disalin');
    }
  };

  const approxKb = qrisImage
    ? Math.round((qrisImage.length * 0.75) / 1024)
    : 0;

  return (
    <AppPageShell variant="withBottomNav">
      <PageHeader
        title="Pengaturan Tenant"
        back
        right={<SwitchOutletControl />}
      />

      {loading ? (
        <Box className="flex justify-center mt-12"><CircularProgress /></Box>
      ) : (
        <PageContainer sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <Accordion
              defaultExpanded={Boolean(pendingLoginPhone)}
              disableGutters
              elevation={0}
              sx={{
                bgcolor: 'transparent',
                '&:before': { display: 'none' },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', pr: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Ubah nomor WhatsApp (login)
                  </Typography>
                  {pendingLoginPhone ? (
                    <Chip size="small" label="Menunggu verifikasi" color="info" />
                  ) : null}
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
                <PhoneChangeSection hideIntro />
              </AccordionDetails>
            </Accordion>
          </Card>

          {/* Info Tenant */}
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={500} className="mb-3">
                Informasi Umum
              </Typography>
              <Box className="flex flex-col gap-3 mt-3">
                <TextField
                  fullWidth
                  label="Nama Tenant *"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <TextField
                  fullWidth
                  label="Alamat"
                  multiline
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Jl. Contoh No. 123, Kota"
                />
                <TextField
                  fullWidth
                  label="Nomor Telepon"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                />
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={500} className="mb-2">
                Pengingat pelanggan (WhatsApp)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Setelah layanan selesai & dibayar, sistem menjadwalkan pesan undangan booking lagi ke nomor WA pelanggan.
                Isi 0 untuk menonaktifkan.
              </Typography>
              <TextField
                fullWidth
                type="number"
                label="Hari setelah kunjungan selesai"
                value={customerReturnReminderDays}
                onChange={(e) => setCustomerReturnReminderDays(Math.min(90, Math.max(0, Number(e.target.value) || 0)))}
                inputProps={{ min: 0, max: 90 }}
                helperText="Mis. 21 = sekitar tiga minggu setelah transaksi selesai."
              />
              <TextField
                fullWidth
                type="number"
                label="Menit sebelum perkiraan dilayani (WA)"
                value={customerAppointmentReminderMinutes}
                onChange={(e) =>
                  setCustomerAppointmentReminderMinutes(Math.min(180, Math.max(0, Number(e.target.value) || 0)))}
                inputProps={{ min: 0, max: 180 }}
                sx={{ mt: 2 }}
                helperText="0 = nonaktif. Contoh: 30 = kirim WA ~30 menit sebelum perkiraan giliran. Hanya dijadwalkan jika estimasi dilayani lebih dari 2 jam dari saat booking diperbarui; membutuhkan staff sudah ditugaskan."
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={500} className="mb-2">
                Kuota booking harian (outlet)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Batasi jumlah antrian <strong>aktif</strong> per hari kalender untuk seluruh outlet: status menunggu dan sedang
                dilayani. Booking selesai atau batal membebaskan slot. Kosongkan untuk tidak membatasi.
              </Typography>
              <TextField
                fullWidth
                type="number"
                label="Maks. antrian aktif per hari (opsional)"
                value={dailyBookingQuota}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '');
                  if (v === '') setDailyBookingQuota('');
                  else setDailyBookingQuota(String(Math.min(9999, parseInt(v, 10))));
                }}
                inputProps={{ min: 1, max: 9999 }}
                placeholder="Tidak dibatasi"
                helperText="Anda juga bisa set batas per staff di menu Kelola Staff."
              />
              <TextField
                fullWidth
                type="number"
                label="Posisi aktif untuk booking"
                value={bookingSeatCount}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '');
                  if (v === '') setBookingSeatCount('');
                  else setBookingSeatCount(String(Math.min(50, parseInt(v, 10))));
                }}
                inputProps={{ min: 1, max: 50 }}
                placeholder="Tidak dipakai"
                sx={{ mt: 2 }}
                helperText="Jika diisi (1–50), pelanggan wajib pilih nomor posisi saat booking; tidak boleh bentrok antara antrian menunggu / sedang dilayani pada hari yang sama."
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={500} className="mb-2">
                Halaman booking pelanggan
              </Typography>
              <FormControlLabel
                control={(
                  <Switch
                    checked={showBookingQty}
                    onChange={(_, v) => setShowBookingQty(v)}
                  />
                )}
                label="Tampilkan jumlah (qty) per layanan"
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Jika dimatikan, setiap layanan dianggap qty 1; pelanggan tidak melihat field kuantitas.
              </Typography>
              <FormControlLabel
                sx={{ mt: 2, display: 'flex', alignItems: 'flex-start' }}
                control={(
                  <Switch
                    checked={allowStaffCreateBooking}
                    onChange={(_, v) => setAllowStaffCreateBooking(v)}
                  />
                )}
                label={(
                  <Box>
                    <Typography variant="body2">Izinkan staff membuat booking</Typography>
                    <Typography variant="caption" color="text.secondary" component="span" display="block">
                      Jika dimatikan, akun staff hanya mengelola antrian; pembuatan booking dari aplikasi pelanggan tidak berubah.
                    </Typography>
                  </Box>
                )}
              />
              <FormControlLabel
                sx={{ mt: 2, display: 'flex', alignItems: 'flex-start' }}
                control={(
                  <Switch
                    checked={requireLoginOnCreateBooking}
                    onChange={(_, v) => setRequireLoginOnCreateBooking(v)}
                  />
                )}
                label={(
                  <Box>
                    <Typography variant="body2">Wajib login OTP untuk booking (QR / pelanggan)</Typography>
                    <Typography variant="caption" color="text.secondary" component="span" display="block">
                      Jika dimatikan, pengunjung QR bisa booking sebagai tamu dengan nama (HP opsional). Jika diaktifkan,
                      alur lama dengan OTP tetap dipakai.
                    </Typography>
                  </Box>
                )}
              />
            </CardContent>
          </Card>

          {/* QRIS Image */}
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <QrCodeIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight={500}>
                    Gambar QRIS Pembayaran
                  </Typography>
                </Box>
                {qrisImage && (
                  <Chip
                    label={`~${approxKb} KB`}
                    size="small"
                    variant="outlined"
                    color="default"
                  />
                )}
              </Box>

              {qrisImage ? (
                <>
                  {/* Preview */}
                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      overflow: 'hidden',
                      mb: 2,
                      textAlign: 'center',
                      bgcolor: 'white',
                      p: 1,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrisImage}
                      alt="QRIS"
                      style={{ maxWidth: '100%', maxHeight: 280, objectFit: 'contain' }}
                    />
                  </Box>

                  <Box display="flex" gap={1.5}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<UploadIcon />}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={qrisUploading}
                    >
                      Ganti Gambar
                    </Button>
                    <Button
                      variant="text"
                      size="small"
                      color="error"
                      startIcon={<DeleteOutlineIcon />}
                      onClick={() => {
                        setQrisImage('');
                        toast('Gambar QRIS dihapus — klik Simpan untuk menyimpan', { icon: '🗑️' });
                      }}
                    >
                      Hapus
                    </Button>
                  </Box>
                </>
              ) : (
                <>
                  <Box
                    sx={{
                      border: '2px dashed',
                      borderColor: 'divider',
                      borderRadius: 2,
                      p: 4,
                      textAlign: 'center',
                      cursor: 'pointer',
                      '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(192,57,43,0.04)' },
                      transition: 'all 0.2s',
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <QrCodeIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary" mb={1}>
                      Belum ada gambar QRIS
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={qrisUploading ? <CircularProgress size={14} /> : <UploadIcon />}
                      disabled={qrisUploading}
                    >
                      {qrisUploading ? 'Memproses...' : 'Pilih Gambar'}
                    </Button>
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                    Format JPG / PNG · Maksimal 2 MB · Gambar ditampilkan saat pelanggan bayar QRIS
                  </Typography>
                </>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleQrisFileChange}
              />
            </CardContent>
          </Card>

          {/* GPS Location */}
          <Card>
            <CardContent>
              <Box className="flex items-center justify-between mb-3">
                <Typography variant="subtitle1" fontWeight={500}>
                  Lokasi GPS
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={detecting ? <CircularProgress size={14} /> : <MyLocationIcon />}
                  onClick={detectLocation}
                  disabled={detecting}
                >
                  {detecting ? 'Mendeteksi...' : 'Deteksi'}
                </Button>
              </Box>

              <Box className="flex gap-3 mb-3">
                <TextField
                  fullWidth
                  label="Latitude"
                  value={form.gpsLat}
                  onChange={(e) => setForm({ ...form, gpsLat: e.target.value })}
                  placeholder="-6.200000"
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Longitude"
                  value={form.gpsLng}
                  onChange={(e) => setForm({ ...form, gpsLng: e.target.value })}
                  placeholder="106.816666"
                  size="small"
                />
              </Box>

              {mapsUrl && (
                <>
                  <Divider className="my-3" />
                  <Box className="bg-gray-50 rounded-lg p-3">
                    <Typography variant="body2" color="text.secondary" className="mb-2">
                      Pratinjau Lokasi
                    </Typography>
                    <Typography variant="body2" className="font-mono text-xs break-all mb-2">
                      {mapsUrl}
                    </Typography>
                    <Box className="flex gap-2">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<OpenInNewIcon />}
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        component="a"
                      >
                        Buka Maps
                      </Button>
                      <IconButton size="small" onClick={copyMapsLink}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </>
              )}

              {!form.gpsLat && !form.gpsLng && (
                <Typography variant="body2" color="text.secondary" className="text-center py-2">
                  Belum ada koordinat GPS. Klik &quot;Deteksi Otomatis&quot; atau isi manual.
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Theme Customization */}
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={500} className="mb-1">
                Tema Warna
              </Typography>
              <Typography variant="caption" color="text.secondary" className="mb-3 block">
                Default: Industrial Modern palette
              </Typography>
              <Box className="grid grid-cols-2 gap-3">
                {([
                  { key: 'primaryColor', label: 'Warna Utama (CTA)' },
                  { key: 'accentColor', label: 'Warna Aksen (Header)' },
                  { key: 'bgColor', label: 'Latar Halaman' },
                  { key: 'paperColor', label: 'Latar Kartu' },
                ] as { key: keyof TenantTheme; label: string }[]).map(({ key, label }) => (
                  <Box key={key}>
                    <Typography variant="caption" color="text.secondary" className="block mb-1">{label}</Typography>
                    <Box className="flex items-center gap-2">
                      <Box
                        component="input"
                        type="color"
                        value={theme[key]}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setTheme((t) => ({ ...t, [key]: e.target.value }))
                        }
                        sx={{ width: 40, height: 40, border: 'none', borderRadius: 1, cursor: 'pointer', p: 0 }}
                      />
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{theme[key]}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
              <Box className="flex gap-2 mt-3">
                <Box className="rounded-lg p-3 flex-1 text-center" sx={{ bgcolor: theme.bgColor }}>
                  <Box className="rounded px-2 py-1 inline-block mb-1" sx={{ bgcolor: theme.primaryColor }}>
                    <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700 }}>Tombol</Typography>
                  </Box>
                  <Box className="rounded px-2 py-1" sx={{ bgcolor: theme.paperColor, border: '1px solid #eee' }}>
                    <Typography variant="caption" sx={{ color: theme.accentColor, fontWeight: 700 }}>Teks</Typography>
                  </Box>
                </Box>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setTheme(DEFAULT_THEME)}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Reset Default
                </Button>
              </Box>
            </CardContent>
          </Card>

          {tenant && (
            <Card className="bg-gray-50">
              <CardContent className="py-3">
                <Typography variant="body2" color="text.secondary">
                  ID Tenant: <span className="font-mono">{tenant._id}</span>
                </Typography>
              </CardContent>
            </Card>
          )}

          <Button
            fullWidth
            variant="contained"
            size="large"
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </Button>
        </PageContainer>
      )}

      <TenantAdminBottomNav />
    </AppPageShell>
  );
}
