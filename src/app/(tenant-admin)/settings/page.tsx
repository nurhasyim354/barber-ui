'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, Button, CircularProgress,
  TextField, Divider, IconButton, Chip,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import QrCodeIcon from '@mui/icons-material/QrCode2';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import { TenantAdminBottomNav } from '@/components/layout/BottomNav';

interface TenantTheme {
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  paperColor: string;
}

const DEFAULT_THEME: TenantTheme = {
  primaryColor: '#8B3A2A',
  accentColor: '#2C3A47',
  bgColor: '#F0EDE8',
  paperColor: '#FFFFFF',
};

interface TenantSettings {
  _id: string;
  name: string;
  address?: string;
  phone?: string;
  location?: { lat: number; lng: number } | null;
  qrisImageBase64?: string | null;
  theme?: TenantTheme | null;
}

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

export default function SettingsPage() {
  const { user, isLoading, loadFromStorage } = useAuthStore();
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

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'tenant_admin') { router.replace('/dashboard'); return; }
    loadTenant();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading]);

  const loadTenant = useCallback(async () => {
    setLoading(true);
    try {
      // /settings endpoint returns full data including qrisImageBase64
      const res = await api.get(`/tenants/${user!.tenantId}/settings`);
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
    } catch {
      toast.error('Gagal memuat data barbershop');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nama barbershop wajib diisi'); return; }

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
      });
      toast.success('Pengaturan berhasil disimpan');
      loadTenant();
    } catch {
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  const handleQrisFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    const reader = new FileReader();
    reader.onload = () => {
      setQrisImage(reader.result as string);
      setQrisUploading(false);
      toast.success('Gambar QRIS siap — klik Simpan untuk menyimpan');
    };
    reader.onerror = () => {
      setQrisUploading(false);
      toast.error('Gagal membaca file');
    };
    reader.readAsDataURL(file);

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
    <Box className="min-h-screen bg-gray-50 pb-24">
      <PageHeader title="Pengaturan Barbershop" back />

      {loading ? (
        <Box className="flex justify-center mt-12"><CircularProgress /></Box>
      ) : (
        <Box className="p-4 max-w-lg mx-auto flex flex-col gap-4">

          {/* Info Barbershop */}
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} className="mb-3">
                Informasi Barbershop
              </Typography>
              <Box className="flex flex-col gap-3">
                <TextField
                  fullWidth
                  label="Nama Barbershop *"
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

          {/* QRIS Image */}
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <QrCodeIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight={700}>
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
                <Typography variant="subtitle1" fontWeight={700}>
                  Lokasi GPS
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={detecting ? <CircularProgress size={14} /> : <MyLocationIcon />}
                  onClick={detectLocation}
                  disabled={detecting}
                >
                  {detecting ? 'Mendeteksi...' : 'Deteksi Otomatis'}
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
              <Typography variant="subtitle1" fontWeight={700} className="mb-1">
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
                  ID Barbershop: <span className="font-mono">{tenant._id}</span>
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
        </Box>
      )}

      <TenantAdminBottomNav />
    </Box>
  );
}
