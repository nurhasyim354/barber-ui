'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, Button, CircularProgress,
  TextField, Divider, IconButton,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import { TenantAdminBottomNav } from '@/components/layout/BottomNav';

interface TenantSettings {
  _id: string;
  name: string;
  address?: string;
  phone?: string;
  gpsLat?: number | null;
  gpsLng?: number | null;
}

export default function SettingsPage() {
  const { user, isLoading, loadFromStorage } = useAuthStore();
  const router = useRouter();

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

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'tenant_admin') { router.replace('/dashboard'); return; }
    loadTenant();
  }, [user, isLoading]);

  const loadTenant = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/tenants/${user!.tenantId}`);
      const t: TenantSettings = res.data;
      setTenant(t);
      setForm({
        name: t.name || '',
        address: t.address || '',
        phone: t.phone || '',
        gpsLat: t.gpsLat != null ? String(t.gpsLat) : '',
        gpsLng: t.gpsLng != null ? String(t.gpsLng) : '',
      });
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
      });
      toast.success('Pengaturan berhasil disimpan');
      loadTenant();
    } catch {
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
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
      { enableHighAccuracy: true, timeout: 10000 }
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
