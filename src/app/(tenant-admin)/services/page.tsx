'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, Button, CircularProgress, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  IconButton, Switch, FormControlLabel, Fab, Avatar, List, ListItem, ListItemText,
  Tooltip, InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LogoutIcon from '@mui/icons-material/Logout';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ClearIcon from '@mui/icons-material/Clear';
import ContentCutIcon from '@mui/icons-material/EditCalendar';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import SearchIcon from '@mui/icons-material/Search';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PrintIcon from '@mui/icons-material/Print';
import toast from 'react-hot-toast';
import QRCode from 'react-qr-code';
import QRCodeLib from 'qrcode';
import api from '@/lib/api';
import { compressImage } from '@/lib/imageUtils';
import { exportWorkbook, parseExcelFile } from '@/lib/excelUtils';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import AppPageShell from '@/components/layout/AppPageShell';
import PageContainer from '@/components/layout/PageContainer';
import { TenantAdminBottomNav } from '@/components/layout/BottomNav';
import { getTenantUiLabels } from '@/lib/tenantLabels';
import { formatDuration } from '@/lib/formatDuration';

interface Service {
  _id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  isActive: boolean;
  photoUrl?: string | null;
  stockQty?: number | null;
  /** Satuan qty opsional (kg, pcs, …). */
  unit?: string | null;
}

const defaultForm = {
  name: '',
  description: '',
  price: '',
  durationMinutes: '30',
  photoUrl: '',
  stockQty: '' as string,
  unit: '',
};

export default function ServicesPage() {
  const { user, isLoading, loadFromStorage, logout } = useAuthStore();
  const ui = getTenantUiLabels(user?.tenantType);
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingQty, setShowBookingQty] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dialog, setDialog] = useState<{ open: boolean; editing: Service | null }>({ open: false, editing: null });
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  type ImportRow = { name: string; description: string; price: number; durationMinutes: number; unit: string; stockQty: number | null };
  const [importDialog, setImportDialog] = useState<{ open: boolean; rows: ImportRow[]; errors: string[]; duplicates: string[] }>({ open: false, rows: [], errors: [], duplicates: [] });
  const [importing, setImporting] = useState(false);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'tenant_admin') { router.replace('/dashboard'); return; }
    loadServices('');
  }, [user, isLoading]);

  // Debounce search input 400ms lalu trigger ke backend
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchQuery(value);
      void loadServices(value);
    }, 400);
  };

  const handleSearchClear = () => {
    setSearchInput('');
    setSearchQuery('');
    void loadServices('');
  };

  const loadServices = useCallback(async (search = searchQuery) => {
    setLoading(true);
    try {
      const params = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
      const [svcRes, settingsRes] = await Promise.all([
        api.get(`/services${params}`),
        user?.tenantId ? api.get(`/tenants/${user.tenantId}/settings`) : Promise.resolve(null),
      ]);
      setServices(svcRes.data);
      if (settingsRes) setShowBookingQty(settingsRes.data?.showBookingQty === true);
    } catch {
      toast.error('Gagal memuat layanan');
    } finally {
      setLoading(false);
    }
  }, [user?.tenantId]);

  const openAdd = () => {
    setForm({ ...defaultForm });
    setDialog({ open: true, editing: null });
  };

  const openEdit = (svc: Service) => {
    setForm({
      name: svc.name,
      description: svc.description,
      price: String(svc.price),
      durationMinutes: String(svc.durationMinutes),
      photoUrl: svc.photoUrl || '',
      stockQty:
        svc.stockQty != null && Number.isFinite(Number(svc.stockQty))
          ? String(Math.min(999999, Math.max(0, Math.floor(Number(svc.stockQty)))))
          : '',
      unit: svc.unit?.trim() || '',
    });
    setDialog({ open: true, editing: svc });
  };

  const handlePhotoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const base64 = await compressImage(file);
      setForm((prev) => ({ ...prev, photoUrl: base64 }));
    } catch {
      toast.error('Gagal memproses foto');
    } finally {
      setPhotoUploading(false);
    }
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!form.name || !form.price) { toast.error('Nama dan harga wajib diisi'); return; }
    setSaving(true);
    try {
      const photoPayload = form.photoUrl.trim() ? form.photoUrl : null;
      const stockQtyPayload =
        form.stockQty.trim() === ''
          ? null
          : Math.min(999999, Math.max(0, parseInt(form.stockQty, 10) || 0));
      const unitPayload = form.unit.trim() === '' ? null : form.unit.trim().slice(0, 24);
      if (dialog.editing) {
        await api.patch(`/services/${dialog.editing._id}`, {
          name: form.name,
          description: form.description,
          price: Number(form.price),
          durationMinutes: Number(form.durationMinutes),
          photoUrl: photoPayload,
          stockQty: stockQtyPayload,
          unit: unitPayload,
        });
        toast.success('Layanan diupdate');
      } else {
        await api.post('/services', {
          name: form.name,
          description: form.description,
          price: Number(form.price),
          durationMinutes: Number(form.durationMinutes),
          ...(photoPayload ? { photoUrl: photoPayload } : {}),
          ...(stockQtyPayload != null ? { stockQty: stockQtyPayload } : {}),
          ...(unitPayload != null ? { unit: unitPayload } : {}),
        });
        toast.success('Layanan ditambahkan');
      }
      setDialog({ open: false, editing: null });
      loadServices();
    } catch {
      toast.error('Gagal menyimpan layanan');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (svc: Service) => {
    try {
      await api.patch(`/services/${svc._id}`, { isActive: !svc.isActive });
      toast.success(`Layanan ${svc.isActive ? 'dinonaktifkan' : 'diaktifkan'}`);
      loadServices();
    } catch {
      toast.error('Gagal mengubah status');
    }
  };

  const confirmDeleteService = async () => {
    if (!serviceToDelete) return;
    setDeletingService(true);
    try {
      await api.delete(`/services/${serviceToDelete._id}`);
      toast.success('Layanan dihapus permanen');
      setServiceToDelete(null);
      loadServices();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menghapus layanan');
    } finally {
      setDeletingService(false);
    }
  };

  /* ── Stiker ──────────────────────────────────────────────── */
  const [stickerService, setStickerService] = useState<Service | null>(null);

  /** URL booking pelanggan dengan layanan langsung terpilih */
  const stickerBookingUrl = (svcId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const tenantId = user?.tenantId ?? '';
    return `${origin}/booking?tenantId=${tenantId}&type=booking&addService=${svcId}`;
  };

  const printSticker = async (svc: Service) => {
    const qrUrl = stickerBookingUrl(svc._id);
    const svgString = await QRCodeLib.toString(qrUrl, { type: 'svg', margin: 1, width: 200 });
    const qrDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
    const fmtPrice = svc.unit
      ? `Rp ${svc.price.toLocaleString('id-ID')} / ${svc.unit}`
      : `Rp ${svc.price.toLocaleString('id-ID')}`;
    const fmtDur = formatDuration(svc.durationMinutes);

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Stiker — ${svc.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #f5f5f5;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      min-height: 100vh;
      padding: 24px 16px;
      gap: 20px;
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #fff;
      border-radius: 10px;
      padding: 10px 18px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.10);
    }
    .toolbar span {
      font-size: 13px;
      color: #555;
    }
    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 20px;
      border-radius: 7px;
      border: none;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
    }
    .btn-print { background: #1565c0; color: #fff; }
    .btn-print:hover { background: #0d47a1; }
    .btn-close { background: #eee; color: #333; }
    .btn-close:hover { background: #ddd; }
    .preview-label {
      font-size: 11px;
      color: #999;
      text-align: center;
    }
    .sticker-wrap {
      background: #fff;
      border-radius: 10px;
      padding: 20px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.10);
    }
    .sticker {
      width: 220px;
      height: 150px;
      display: flex;
      flex-direction: row;
      align-items: center;
      padding: 10px;
      gap: 10px;
      border: 1.5px solid #e0e0e0;
      border-radius: 6px;
    }
    .qr img { display: block; width: 106px; height: 106px; }
    .info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 4px;
      overflow: hidden;
    }
    .name { font-size: 9pt; font-weight: 700; color: #111; line-height: 1.2; word-break: break-word; }
    .price { font-size: 11pt; font-weight: 800; color: #1565c0; }
    .dur { font-size: 7pt; color: #666; }

    @media print {
      body { background: #fff; padding: 0; min-height: unset; }
      .toolbar, .preview-label { display: none; }
      .sticker-wrap { box-shadow: none; padding: 0; border-radius: 0; }
      .sticker {
        width: 58mm; height: 40mm;
        border: 1px solid #ddd;
        border-radius: 0;
        padding: 3mm;
        gap: 3mm;
      }
      .qr img { width: 28mm; height: 28mm; }
      .name { font-size: 8.5pt; }
      .price { font-size: 10pt; }
      .dur { font-size: 6.5pt; }
      @page { size: 58mm 40mm; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span>Preview stiker · 58×40mm</span>
    <button class="btn btn-print" onclick="window.print()">🖨️ Cetak</button>
    <button class="btn btn-close" onclick="window.close()">✕ Tutup</button>
  </div>
  <div class="sticker-wrap">
    <div class="sticker">
      <div class="qr"><img src="${qrDataUrl}" width="106" height="106" alt="QR" /></div>
      <div class="info">
        <div class="name">${svc.name}</div>
        <div class="price">${fmtPrice}</div>
        <div class="dur">${fmtDur}</div>
      </div>
    </div>
  </div>
  <div class="preview-label">Klik tombol Cetak untuk mencetak ke printer / simpan sebagai PDF</div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=480,height=420');
    if (!win) { toast.error('Pop-up diblokir browser. Izinkan pop-up untuk mencetak stiker.'); return; }
    win.document.write(html);
    win.document.close();
  };

  const handleOpenSticker = (svc: Service) => setStickerService(svc);

  const handlePrintSticker = () => {
    if (!stickerService) return;
    void printSticker(stickerService);
  };

  const handlePrintAllStickers = async () => {
    if (services.length === 0) { toast.error('Tidak ada layanan'); return; }

    const activeServices = services.filter((s) => s.isActive);

    const rows = await Promise.all(
      activeServices.map(async (svc) => {
        const fmtPrice = svc.unit
          ? `Rp ${svc.price.toLocaleString('id-ID')} / ${svc.unit}`
          : `Rp ${svc.price.toLocaleString('id-ID')}`;
        const fmtDur = formatDuration(svc.durationMinutes);
        const svgString = await QRCodeLib.toString(stickerBookingUrl(svc._id), { type: 'svg', margin: 1, width: 200 });
        const qrDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
        return { svc, fmtPrice, fmtDur, qrDataUrl };
      }),
    );

    const stickerBlocks = rows.map(({ svc, fmtPrice, fmtDur, qrDataUrl }) => {
      return `
      <div class="sticker">
        <div class="qr"><img src="${qrDataUrl}" width="100" height="100" alt="QR" /></div>
        <div class="info">
          <div class="name">${svc.name}</div>
          <div class="price">${fmtPrice}</div>
          <div class="dur">${fmtDur}</div>
        </div>
      </div>`;
    }).join('');

    const activeCount = rows.length;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Semua Stiker Layanan (${activeCount})</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; padding: 20px; }
    .toolbar {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
      background: #fff; border-radius: 10px; padding: 10px 18px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.10); margin-bottom: 20px;
    }
    .toolbar span { font-size: 13px; color: #555; flex: 1; }
    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 20px; border-radius: 7px; border: none;
      cursor: pointer; font-size: 13px; font-weight: 600;
    }
    .btn-print { background: #1565c0; color: #fff; }
    .btn-print:hover { background: #0d47a1; }
    .btn-close { background: #eee; color: #333; }
    .btn-close:hover { background: #ddd; }
    .grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .sticker {
      width: 220px; height: 150px;
      display: flex; flex-direction: row; align-items: center;
      padding: 10px; gap: 10px;
      border: 1.5px solid #e0e0e0; border-radius: 6px;
      background: #fff; page-break-inside: avoid;
    }
    .qr img { display: block; }
    .info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 4px; overflow: hidden; }
    .name { font-size: 9pt; font-weight: 700; color: #111; line-height: 1.2; word-break: break-word; }
    .price { font-size: 11pt; font-weight: 800; color: #1565c0; }
    .dur { font-size: 7pt; color: #666; }

    @media print {
      body { background: #fff; padding: 0; }
      .toolbar { display: none; }
      .grid { gap: 3mm; }
      .sticker {
        width: 58mm; height: 40mm;
        border: 1px solid #ccc; border-radius: 0;
        padding: 3mm; gap: 3mm;
      }
      .qr img { width: 28mm !important; height: 28mm !important; }
      .name { font-size: 8.5pt; }
      .price { font-size: 10pt; }
      .dur { font-size: 6.5pt; }
      @page { size: A4; margin: 8mm; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span>Preview ${activeCount} stiker layanan aktif · 58×40mm per stiker</span>
    <button class="btn btn-print" onclick="window.print()">🖨️ Cetak Semua</button>
    <button class="btn btn-close" onclick="window.close()">✕ Tutup</button>
  </div>
  <div class="grid">${stickerBlocks}</div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { toast.error('Pop-up diblokir browser. Izinkan pop-up untuk mencetak stiker.'); return; }
    win.document.write(html);
    win.document.close();
  };

  const handleExportServices = () => {
    if (services.length === 0) { toast.error('Tidak ada layanan untuk diekspor'); return; }
    exportWorkbook([{
      name: 'Layanan',
      rows: services.map((s) => ({
        'Nama Layanan': s.name,
        'Deskripsi': s.description,
        'Harga (Rp)': s.price,
        'Durasi (menit)': s.durationMinutes,
        'Satuan': s.unit ?? '',
        'Stok': s.stockQty ?? '',
        'Aktif': s.isActive ? 'Ya' : 'Tidak',
      })),
    }], 'layanan');
    toast.success('File Excel berhasil diunduh');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const rawRows = await parseExcelFile(file);
      const rows: ImportRow[] = [];
      const errors: string[] = [];
      const duplicates: string[] = [];

      // Nama yang sudah ada di sistem (case-insensitive)
      const existingNames = new Set(services.map((s) => s.name.toLowerCase()));
      // Nama yang sudah diproses dalam batch ini
      const batchNames = new Set<string>();

      rawRows.forEach((r, idx) => {
        const rowNum = idx + 2;
        const name = String(r['Nama Layanan'] ?? '').trim();
        if (!name) { errors.push(`Baris ${rowNum}: Nama Layanan wajib diisi`); return; }
        const price = Number(r['Harga (Rp)'] ?? 0);
        if (isNaN(price) || price < 0) { errors.push(`Baris ${rowNum}: Harga tidak valid`); return; }

        const nameLower = name.toLowerCase();
        if (existingNames.has(nameLower) || batchNames.has(nameLower)) {
          duplicates.push(name);
          return;
        }
        batchNames.add(nameLower);

        const dur = Number(r['Durasi (menit)'] ?? 30);
        const stockRaw = String(r['Stok'] ?? '').trim();
        const stockQty = stockRaw === '' ? null : Math.max(0, parseInt(stockRaw, 10) || 0);
        rows.push({
          name,
          description: String(r['Deskripsi'] ?? '').trim(),
          price: Math.round(price),
          durationMinutes: isNaN(dur) || dur < 5 ? 30 : Math.round(dur),
          unit: String(r['Satuan'] ?? '').trim().slice(0, 24),
          stockQty,
        });
      });
      setImportDialog({ open: true, rows, errors, duplicates });
    } catch {
      toast.error('Gagal membaca file Excel');
    }
  };

  const handleConfirmImport = async () => {
    if (importDialog.rows.length === 0) return;
    setImporting(true);
    let ok = 0; let fail = 0;
    for (const row of importDialog.rows) {
      try {
        await api.post('/services', {
          name: row.name,
          description: row.description,
          price: row.price,
          durationMinutes: row.durationMinutes,
          ...(row.unit ? { unit: row.unit } : {}),
          ...(row.stockQty != null ? { stockQty: row.stockQty } : {}),
        });
        ok++;
      } catch {
        fail++;
      }
    }
    setImporting(false);
    setImportDialog({ open: false, rows: [], errors: [], duplicates: [] });
    toast.success(`Import selesai: ${ok} berhasil${fail > 0 ? `, ${fail} gagal` : ''}${importDialog.duplicates.length > 0 ? `, ${importDialog.duplicates.length} duplikat dilewati` : ''}`);
    loadServices();
  };

  const handleDownloadTemplate = () => {
    exportWorkbook([{
      name: 'Layanan',
      rows: [{ 'Nama Layanan': 'Contoh Layanan', 'Deskripsi': 'Deskripsi opsional', 'Harga (Rp)': 50000, 'Durasi (menit)': 30, 'Satuan': 'pcs', 'Stok': 100 }],
    }], 'template_layanan');
  };

  return (
    <AppPageShell variant="withBottomNav">
      <input ref={importFileRef} type="file" accept=".xlsx,.xls" hidden onChange={handleImportFile} />

      <PageHeader title={`Kelola ${ui.navServices}`}
      right={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="Cetak semua stiker layanan aktif">
            <IconButton color="inherit" size="small" onClick={() => void handlePrintAllStickers()}>
              <PrintIcon />
            </IconButton>
          </Tooltip>
          <IconButton color="inherit" size="small" onClick={handleExportServices} title="Export Excel">
            <DownloadIcon />
          </IconButton>
          <IconButton color="inherit" size="small" onClick={() => importFileRef.current?.click()} title="Import Excel">
            <UploadIcon />
          </IconButton>
          <IconButton color="inherit" onClick={() => { logout(); router.push('/login'); }}>
            <LogoutIcon />
          </IconButton>
        </Box>
      }
      />

      {loading && services.length === 0 ? (
        <Box className="flex justify-center mt-12"><CircularProgress /></Box>
      ) : (
        <PageContainer>
          {/* Search bar */}
          <TextField
            fullWidth
            size="small"
            placeholder="Cari nama atau deskripsi layanan…"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {loading ? <CircularProgress size={16} /> : <SearchIcon color="action" fontSize="small" />}
                </InputAdornment>
              ),
              endAdornment: searchInput ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleSearchClear} edge="end">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />

          {services.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Typography color="text.secondary">
                  {searchQuery ? `Layanan "${searchQuery}" tidak ditemukan` : 'Belum ada layanan'}
                </Typography>
                {!searchQuery && (
                  <Button variant="contained" startIcon={<AddIcon />} className="mt-4" onClick={openAdd}>
                    Tambah Layanan
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Box className="flex flex-col gap-3">
              {services.map((svc) => (
                <Card
                  key={svc._id}
                  variant="outlined"
                  sx={
                    svc.isActive
                      ? { borderColor: 'divider' }
                      : (theme) => ({
                          borderStyle: 'dashed',
                          borderColor: 'text.disabled',
                          bgcolor:
                            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'grey.100',
                          boxShadow: 'none',
                        })
                  }
                >
                  <CardContent>
                    <Box className="flex justify-between items-start gap-2">
                      <Avatar
                        src={svc.photoUrl || undefined}
                        variant="rounded"
                        sx={{
                          width: 56,
                          height: 56,
                          flexShrink: 0,
                          bgcolor: 'primary.light',
                          ...(!svc.isActive
                            ? { filter: 'grayscale(0.6)', opacity: 0.85 }
                            : {}),
                        }}
                      >
                        {!svc.photoUrl && <ContentCutIcon />}
                      </Avatar>
                      <Box className="flex-1 min-w-0">
                        <Box className="flex items-center gap-1 flex-wrap">
                          <Typography fontWeight={500} color={svc.isActive ? 'text.primary' : 'text.secondary'}>
                            {svc.name}
                          </Typography>
                          {!svc.isActive && (
                            <Chip label="Dinonaktifkan" size="small" color="default" variant="outlined" />
                          )}
                        </Box>
                        {svc.description && (
                          <Typography
                            variant="body2"
                            color={svc.isActive ? 'text.secondary' : 'text.disabled'}
                          >
                            {svc.description}
                          </Typography>
                        )}
                        <Typography
                          color={svc.isActive ? 'primary' : 'text.disabled'}
                          fontWeight={600}
                          className="mt-1"
                        >
                          Rp {svc.price.toLocaleString('id-ID')}
                          <Typography component="span" variant="caption" display="block" color="text.secondary">
                            {formatDuration(svc.durationMinutes)}
                          </Typography>
                          {showBookingQty && svc.unit ? (
                            <Typography component="span" variant="caption" display="block" color="text.secondary">
                              Satuan: {svc.unit}
                            </Typography>
                          ) : null}
                          {showBookingQty && typeof svc.stockQty === 'number' && (
                            <Typography component="span" variant="caption" display="block" color="text.secondary">
                              Stok terlacak: {svc.stockQty}
                            </Typography>
                          )}
                        </Typography>
                      </Box>
                      <Box className="flex items-center gap-1">
                        <Tooltip title="Cetak stiker">
                          <IconButton size="small" onClick={() => handleOpenSticker(svc)}>
                            <LocalOfferIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <IconButton size="small" onClick={() => openEdit(svc)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setServiceToDelete(svc)}
                          aria-label="Hapus layanan"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={svc.isActive}
                          onChange={() => handleToggle(svc)}
                          color="primary"
                          size="small"
                        />
                      }
                      label={svc.isActive ? 'Aktif' : 'Nonaktif'}
                    />
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </PageContainer>
      )}

      <Fab
        color="primary"
        className="fixed bottom-20 right-4"
        sx={{ position: 'fixed', bottom: 80, right: 16 }}
        onClick={openAdd}
      >
        <AddIcon />
      </Fab>

      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, editing: null })} fullWidth maxWidth="xs">
        <DialogTitle fontWeight={500}>
          {dialog.editing ? 'Edit Layanan' : 'Tambah Layanan'}
        </DialogTitle>
        <DialogContent className="flex flex-col gap-4 pt-2">
          <Box className="flex flex-col items-center gap-2">
            <Box className="relative">
              <Avatar
                src={form.photoUrl || undefined}
                variant="rounded"
                sx={{ width: 96, height: 96, bgcolor: 'primary.main', fontSize: 36 }}
              >
                {!form.photoUrl && <ContentCutIcon sx={{ fontSize: 40 }} />}
              </Avatar>
              {photoUploading && (
                <Box className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                  <CircularProgress size={28} sx={{ color: 'white' }} />
                </Box>
              )}
              {form.photoUrl && (
                <IconButton
                  size="small"
                  onClick={() => setForm((p) => ({ ...p, photoUrl: '' }))}
                  sx={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    bgcolor: 'error.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'error.dark' },
                    width: 26,
                    height: 26,
                  }}
                >
                  <ClearIcon sx={{ fontSize: 14 }} />
                </IconButton>
              )}
            </Box>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handlePhotoPick}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<PhotoCameraIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={photoUploading}
            >
              {form.photoUrl ? 'Ganti foto layanan' : 'Foto layanan (opsional)'}
            </Button>
            <Typography variant="caption" color="text.secondary" textAlign="center">
              JPG/PNG · otomatis dikompresi
            </Typography>
          </Box>
          <TextField
            fullWidth
            label="Nama Layanan"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            sx={{ mt: 1 }}
          />
          <TextField
            fullWidth
            label="Deskripsi (opsional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <TextField
            fullWidth
            label="Harga (Rp)"
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            inputProps={{ min: 0 }}
          />
          <TextField
            fullWidth
            label="Durasi (menit)"
            type="number"
            value={form.durationMinutes}
            onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
            inputProps={{ min: 5, step: 5 }}
          />
          {showBookingQty && (
            <TextField
              fullWidth
              label="Satuan (opsional)"
              placeholder="Mis. kg, pcs, bks"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value.slice(0, 24) })}
              helperText="Tampil di booking & nota bila diisi. Qty bisa desimal (titik atau koma)."
            />
          )}
          {showBookingQty && (
            <TextField
              fullWidth
              label="Stok (opsional)"
              type="number"
              value={form.stockQty}
              onChange={(e) => setForm({ ...form, stockQty: e.target.value.replace(/\D/g, '') })}
              inputProps={{ min: 0, max: 999999 }}
              helperText="Kosongkan jika stok tidak dilacak. Saat layanan mulai, stok berkurang sesuai qty booking."
            />
          )}
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={() => setDialog({ open: false, editing: null })} variant="outlined" fullWidth>
            Batal
          </Button>
          <Button onClick={handleSave} variant="contained" fullWidth disabled={saving}>
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Simpan'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!serviceToDelete} onClose={() => !deletingService && setServiceToDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={500}>Hapus layanan permanen?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Layanan <strong>{serviceToDelete?.name}</strong> akan dihapus dari katalog. Tindakan ini tidak dapat dikembalikan.
          </Typography>
        </DialogContent>
        <DialogActions className="p-4 gap-2">
          <Button onClick={() => setServiceToDelete(null)} variant="outlined" fullWidth disabled={deletingService}>
            Batal
          </Button>
          <Button
            onClick={() => void confirmDeleteService()}
            variant="contained"
            color="error"
            fullWidth
            disabled={deletingService}
          >
            {deletingService ? <CircularProgress size={20} color="inherit" /> : 'Hapus permanen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stiker Preview Dialog */}
      <Dialog
        open={!!stickerService}
        onClose={() => setStickerService(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle fontWeight={500} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocalOfferIcon fontSize="small" color="primary" />
          Preview Stiker
        </DialogTitle>
        <DialogContent>
          {stickerService && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 1 }}>
              {/* Preview stiker */}
              <Box
                sx={{
                  width: 232,
                  height: 160,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  p: 1.5,
                  gap: 1.5,
                  bgcolor: 'background.paper',
                  boxShadow: 2,
                }}
              >
                {/* QR code */}
                <Box sx={{ flexShrink: 0 }}>
                  <QRCode
                    value={stickerBookingUrl(stickerService._id)}
                    size={110}
                    style={{ display: 'block' }}
                  />
                </Box>
                {/* Info */}
                <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography fontWeight={700} variant="body2" sx={{ lineHeight: 1.2, wordBreak: 'break-word' }}>
                    {stickerService.name}
                  </Typography>
                  <Typography fontWeight={800} color="primary" sx={{ fontSize: '1rem' }}>
                    Rp {stickerService.price.toLocaleString('id-ID')}
                    {stickerService.unit ? ` / ${stickerService.unit}` : ''}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDuration(stickerService.durationMinutes)}
                  </Typography>
                </Box>
              </Box>

              <Typography variant="caption" color="text.secondary" textAlign="center">
                Ukuran cetak: 58×40 mm · QR membuka halaman booking dengan layanan ini terpilih
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setStickerService(null)} variant="outlined" fullWidth>
            Tutup
          </Button>
          <Button
            onClick={handlePrintSticker}
            variant="contained"
            startIcon={<PrintIcon />}
            fullWidth
          >
            Cetak Stiker
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Preview Dialog */}
      <Dialog open={importDialog.open} onClose={() => !importing && setImportDialog({ open: false, rows: [], errors: [], duplicates: [] })} fullWidth maxWidth="xs">
        <DialogTitle fontWeight={500}>Konfirmasi Import Layanan</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            <strong>{importDialog.rows.length}</strong> layanan baru siap diimport.
            {importDialog.duplicates.length > 0 && ` ${importDialog.duplicates.length} duplikat dilewati.`}
          </Typography>
          {importDialog.duplicates.length > 0 && (
            <Box sx={{ mb: 1, p: 1, borderRadius: 1, bgcolor: 'warning.light', opacity: 0.85 }}>
              <Typography variant="caption" color="warning.dark" fontWeight={600}>
                Dilewati karena sudah ada ({importDialog.duplicates.length}):
              </Typography>
              <Typography variant="caption" color="warning.dark" display="block">
                {importDialog.duplicates.slice(0, 5).join(', ')}{importDialog.duplicates.length > 5 ? `, … +${importDialog.duplicates.length - 5} lainnya` : ''}
              </Typography>
            </Box>
          )}
          {importDialog.errors.length > 0 && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="error" fontWeight={600}>
                {importDialog.errors.length} baris error dilewati:
              </Typography>
              <List dense disablePadding>
                {importDialog.errors.slice(0, 5).map((e, i) => (
                  <ListItem key={i} disablePadding>
                    <ListItemText primaryTypographyProps={{ variant: 'caption', color: 'error' }} primary={e} />
                  </ListItem>
                ))}
                {importDialog.errors.length > 5 && (
                  <ListItem disablePadding>
                    <ListItemText primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }} primary={`… dan ${importDialog.errors.length - 5} lainnya`} />
                  </ListItem>
                )}
              </List>
            </Box>
          )}
          <List dense disablePadding sx={{ maxHeight: 220, overflow: 'auto' }}>
            {importDialog.rows.slice(0, 20).map((r, i) => (
              <ListItem key={i} disablePadding>
                <ListItemText
                  primary={r.name}
                  secondary={`Rp ${r.price.toLocaleString('id-ID')} · ${formatDuration(r.durationMinutes)}`}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItem>
            ))}
            {importDialog.rows.length > 20 && (
              <ListItem disablePadding>
                <ListItemText primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }} primary={`… dan ${importDialog.rows.length - 20} layanan lainnya`} />
              </ListItem>
            )}
          </List>
          <Button size="small" onClick={handleDownloadTemplate} startIcon={<DownloadIcon />} sx={{ mt: 1 }}>
            Unduh template Excel
          </Button>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setImportDialog({ open: false, rows: [], errors: [], duplicates: [] })} variant="outlined" fullWidth disabled={importing}>
            Batal
          </Button>
          <Button onClick={() => void handleConfirmImport()} variant="contained" fullWidth disabled={importing || importDialog.rows.length === 0}>
            {importing ? <CircularProgress size={20} color="inherit" /> : importDialog.rows.length === 0 ? 'Tidak ada data baru' : `Import ${importDialog.rows.length} Layanan`}
          </Button>
        </DialogActions>
      </Dialog>

      <TenantAdminBottomNav />
    </AppPageShell>
  );
}
