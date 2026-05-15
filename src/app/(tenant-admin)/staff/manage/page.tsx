'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box, Card, CardContent, Typography, Button, CircularProgress,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Avatar, IconButton, Chip, Switch, Rating, Pagination,
    List, ListItem, ListItemText,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ClearIcon from '@mui/icons-material/Clear';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { compressImage } from '@/lib/imageUtils';
import { exportWorkbook, parseExcelFile } from '@/lib/excelUtils';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import AppPageShell from '@/components/layout/AppPageShell';
import PageContainer from '@/components/layout/PageContainer';
import { TenantAdminBottomNav } from '@/components/layout/BottomNav';
import { getTenantUiLabels } from '@/lib/tenantLabels';

type StaffDayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

const STAFF_DAY_ROWS: { key: StaffDayKey; label: string }[] = [
    { key: 'mon', label: 'Senin' },
    { key: 'tue', label: 'Selasa' },
    { key: 'wed', label: 'Rabu' },
    { key: 'thu', label: 'Kamis' },
    { key: 'fri', label: 'Jumat' },
    { key: 'sat', label: 'Sabtu' },
    { key: 'sun', label: 'Minggu' },
];

type TimeWindow = { start: string; end: string };

function emptyWeeklySchedule(): Record<StaffDayKey, TimeWindow[]> {
    return { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
}

function parseAvailabilityFromApi(raw: unknown): Record<StaffDayKey, TimeWindow[]> {
    const out = emptyWeeklySchedule();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    const o = raw as Record<string, unknown>;
    for (const { key } of STAFF_DAY_ROWS) {
        const v = o[key];
        if (!Array.isArray(v)) continue;
        out[key] = v
            .map((x) => {
                if (!x || typeof x !== 'object') return null;
                const start = String((x as { start?: string }).start ?? '').replace(/\./g, ':').trim();
                const end = String((x as { end?: string }).end ?? '').replace(/\./g, ':').trim();
                if (!start || !end) return null;
                return { start, end };
            })
            .filter(Boolean) as TimeWindow[];
    }
    return out;
}

function buildAvailabilityPayload(sched: Record<StaffDayKey, TimeWindow[]>): Record<string, { start: string; end: string }[]> | null {
    const out: Record<string, { start: string; end: string }[]> = {};
    for (const { key } of STAFF_DAY_ROWS) {
        const wins = sched[key]
            .map((w) => ({
                start: w.start.replace(/\./g, ':').trim(),
                end: w.end.replace(/\./g, ':').trim(),
            }))
            .filter((w) => w.start && w.end);
        if (wins.length > 0) out[key] = wins;
    }
    return Object.keys(out).length > 0 ? out : null;
}

interface StaffMember {
    _id: string;
    name: string;
    photoUrl?: string;
    specialty?: string;
    phone?: string;
    rating: number;
    totalReviews: number;
    isActive: boolean;
    isAvailable: boolean;
    dailyBookingQuota?: number | null;
    availabilityDaysHours?: Record<string, { start: string; end: string }[]> | null;
}

const defaultForm = { name: '', photoUrl: '', specialty: '', phone: '', dailyBookingQuota: '' as string };
const PAGE_SIZE = 20;

export default function StaffManagementPage() {
    const { user, isLoading, loadFromStorage, logout } = useAuthStore();
    const router = useRouter();

    const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState(defaultForm);
    const [editId, setEditId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [photoUploading, setPhotoUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const importFileRef = useRef<HTMLInputElement>(null);
    type ImportStaffRow = { name: string; phone: string; specialty: string; dailyBookingQuota: number | null };
    const [importDialog, setImportDialog] = useState<{ open: boolean; rows: ImportStaffRow[]; errors: string[]; duplicates: string[] }>({ open: false, rows: [], errors: [], duplicates: [] });
    const [importing, setImporting] = useState(false);
    const [weeklySchedule, setWeeklySchedule] = useState(emptyWeeklySchedule());

    useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

    useEffect(() => {
        if (isLoading) return;
        if (!user) { router.replace('/login'); return; }
        if (user.role !== 'tenant_admin') { router.replace('/dashboard'); return; }
        loadStaffPage();
    }, [user, isLoading]);

    const loadStaffPage = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const res = await api.get(`/staff?page=${p}&limit=${PAGE_SIZE}`);
            setStaffMembers(res.data.data);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
            setPage(p);
        } catch {
            toast.error('Gagal memuat data staff');
        } finally {
            setLoading(false);
        }
    }, []);

    const openAdd = () => {
        setForm(defaultForm);
        setEditId(null);
        setWeeklySchedule(emptyWeeklySchedule());
        setDialogOpen(true);
    };

    const handleEdit = (b: StaffMember) => {
        const dq =
            b.dailyBookingQuota != null && b.dailyBookingQuota > 0 ? String(Math.min(9999, b.dailyBookingQuota)) : '';
        setForm({
            name: b.name,
            photoUrl: b.photoUrl || '',
            specialty: b.specialty || '',
            phone: b.phone || '',
            dailyBookingQuota: dq,
        });
        setEditId(b._id);
        setWeeklySchedule(parseAvailabilityFromApi(b.availabilityDaysHours));
        setDialogOpen(true);
    };

    const ui = getTenantUiLabels(user?.tenantType);

    const handleSave = async () => {
        if (!form.name.trim()) { toast.error('Nama wajib diisi'); return; }
        setSaving(true);
        try {
            const quotaPayload =
                form.dailyBookingQuota.trim() === ''
                    ? { dailyBookingQuota: null }
                    : { dailyBookingQuota: Math.min(9999, Math.max(1, parseInt(form.dailyBookingQuota, 10) || 1)) };
            const schedPayload = buildAvailabilityPayload(weeklySchedule);
            if (editId) {
                await api.patch(`/staff/${editId}`, {
                    name: form.name,
                    photoUrl: form.photoUrl,
                    phone: form.phone,
                    isActive: true,
                    ...quotaPayload,
                    availabilityDaysHours: schedPayload,
                });
                toast.success(`${ui.staffSingular} diupdate`);
            } else {
                await api.post('/staff', {
                    name: form.name,
                    photoUrl: form.photoUrl,
                    phone: form.phone,
                    ...quotaPayload,
                    ...(schedPayload ? { availabilityDaysHours: schedPayload } : {}),
                });
                toast.success(`${ui.staffSingular} berhasil ditambahkan`);
            }
            setDialogOpen(false);
            loadStaffPage(page);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || 'Gagal menyimpan data staff');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (b: StaffMember) => {
        try {
            await api.patch(`/staff/${b._id}`, { isActive: !b.isActive });
            toast.success(b.isActive ? 'Staff dinonaktifkan' : 'Staff diaktifkan');
            loadStaffPage(page);
        } catch {
            toast.error('Gagal update status');
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    const handleDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            await api.delete(`/staff/${deleteId}`);
            toast.success('Staff dihapus permanen');
            setDeleteId(null);
            loadStaffPage(page);
        } catch {
            toast.error('Gagal menghapus staff');
        } finally {
            setDeleting(false);
        }
    };

    const handleExportStaff = () => {
        if (staffMembers.length === 0) { toast.error('Tidak ada staff untuk diekspor'); return; }
        exportWorkbook([{
            name: 'Staff',
            rows: staffMembers.map((s) => ({
                'Nama': s.name,
                'Spesialisasi': s.specialty ?? '',
                'No. HP': s.phone ?? '',
                'Rating': s.rating || 0,
                'Kuota Harian': s.dailyBookingQuota ?? '',
                'Aktif': s.isActive ? 'Ya' : 'Tidak',
            })),
        }], 'staff');
        toast.success('File Excel berhasil diunduh');
    };

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        try {
            // Ambil semua nama staff yang sudah ada untuk cek duplikat
            const allStaffRes = await api.get('/staff?limit=10000');
            const allStaffNames = new Set<string>(
                (allStaffRes.data.data as { name: string }[]).map((s) => s.name.toLowerCase()),
            );

            const rawRows = await parseExcelFile(file);
            const rows: ImportStaffRow[] = [];
            const errors: string[] = [];
            const duplicates: string[] = [];
            const batchNames = new Set<string>();

            rawRows.forEach((r, idx) => {
                const rowNum = idx + 2;
                const name = String(r['Nama'] ?? '').trim();
                if (!name) { errors.push(`Baris ${rowNum}: Nama wajib diisi`); return; }

                const nameLower = name.toLowerCase();
                if (allStaffNames.has(nameLower) || batchNames.has(nameLower)) {
                    duplicates.push(name);
                    return;
                }
                batchNames.add(nameLower);

                const quotaRaw = String(r['Kuota Harian'] ?? '').trim();
                const quota = quotaRaw === '' ? null : Math.max(1, parseInt(quotaRaw, 10) || 1);
                rows.push({
                    name,
                    phone: String(r['No. HP'] ?? '').replace(/\D/g, ''),
                    specialty: String(r['Spesialisasi'] ?? '').trim(),
                    dailyBookingQuota: quota,
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
                await api.post('/staff', {
                    name: row.name,
                    ...(row.phone ? { phone: row.phone } : {}),
                    ...(row.specialty ? { specialty: row.specialty } : {}),
                    ...(row.dailyBookingQuota != null ? { dailyBookingQuota: row.dailyBookingQuota } : {}),
                });
                ok++;
            } catch { fail++; }
        }
        setImporting(false);
        setImportDialog({ open: false, rows: [], errors: [], duplicates: [] });
        toast.success(`Import selesai: ${ok} berhasil${fail > 0 ? `, ${fail} gagal` : ''}${importDialog.duplicates.length > 0 ? `, ${importDialog.duplicates.length} duplikat dilewati` : ''}`);
        loadStaffPage();
    };

    const handleDownloadTemplate = () => {
        exportWorkbook([{
            name: 'Staff',
            rows: [{ 'Nama': 'Budi', 'Spesialisasi': 'Pangkas rambut', 'No. HP': '08123456789', 'Kuota Harian': '' }],
        }], 'template_staff');
    };

    return (
        <AppPageShell variant="withBottomNav">
            <input ref={importFileRef} type="file" accept=".xlsx,.xls" hidden onChange={handleImportFile} />
            <PageHeader
                title={`${ui.staffTeamTitle} (${total})`}
                right={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <IconButton color="inherit" size="small" onClick={handleExportStaff} title="Export Excel">
                            <DownloadIcon />
                        </IconButton>
                        <IconButton color="inherit" size="small" onClick={() => importFileRef.current?.click()} title="Import Excel">
                            <UploadIcon />
                        </IconButton>
                        <IconButton color="inherit" onClick={openAdd}>
                            <AddIcon />
                        </IconButton>
                        <IconButton color="inherit" onClick={() => { logout(); router.push('/login'); }}>
                            <LogoutIcon />
                        </IconButton>
                    </Box>
                }
            />

            {loading ? (
                <Box className="flex justify-center mt-12"><CircularProgress /></Box>
            ) : (
                <PageContainer>
                    {staffMembers.length === 0 ? (
                        <Card>
                            <CardContent className="text-center py-12">
                                <PersonIcon sx={{ fontSize: 72, color: 'text.disabled' }} />
                                <Typography variant="h6" color="text.secondary" className="mt-2">Belum ada staff</Typography>
                                <Typography variant="body2" color="text.disabled" className="mb-4">
                                    Tambahkan staff untuk memulai
                                </Typography>
                                <Button variant="contained" onClick={openAdd} startIcon={<AddIcon />}>
                                    Tambah Staff Pertama
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                        <Box className="flex flex-col gap-3">
                            {staffMembers.map((b) => (
                                <Card key={b._id} className={!b.isActive ? 'opacity-60' : ''}>
                                    <CardContent>
                                        <Box className="flex items-center gap-3">
                                            <Avatar
                                                src={b.photoUrl}
                                                sx={{ width: 68, height: 68, bgcolor: 'primary.main', fontSize: 28, fontWeight: 700 }}
                                            >
                                                {!b.photoUrl && b.name ? b.name.charAt(0).toUpperCase() : <PersonIcon />}
                                            </Avatar>

                                            <Box className="flex-1 min-w-0">
                                                <Box className="flex items-center gap-2 flex-wrap">
                                                    <Typography fontWeight={500} variant="h6">{b.name}</Typography>
                                                    {!b.isActive && (
                                                        <Chip label="Nonaktif" size="small" color="default" />
                                                    )}
                                                </Box>
                                                {b.specialty && (
                                                    <Typography variant="body2" color="text.secondary">{b.specialty}</Typography>
                                                )}
                                                {b.phone && (
                                                    <Typography variant="caption" color="text.secondary">📱 {b.phone}</Typography>
                                                )}
                                                {b.dailyBookingQuota != null && b.dailyBookingQuota > 0 && (
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        Kuota harian: {b.dailyBookingQuota} antrian aktif
                                                    </Typography>
                                                )}
                                                <Box className="flex items-center gap-1 mt-1">
                                                    <Rating value={b.rating || 0} precision={0.1} size="small" readOnly />
                                                    <Typography variant="body2" color="text.secondary">
                                                        {b.rating > 0
                                                            ? `${b.rating.toFixed(1)}${b.totalReviews > 0 ? ` (${b.totalReviews})` : ''}`
                                                            : 'Belum ada rating'}
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            <Box className="flex flex-col items-center gap-1">
                                                <IconButton size="small" onClick={() => handleEdit(b)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton size="small" color="error" onClick={() => setDeleteId(b._id)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                                <Switch
                                                    size="small"
                                                    checked={b.isActive}
                                                    onChange={() => handleToggleActive(b)}
                                                />
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>
                        {totalPages > 1 && (
                            <Box className="flex justify-center mt-4">
                                <Pagination
                                    count={totalPages}
                                    page={page}
                                    onChange={(_, v) => loadStaffPage(v)}
                                    color="primary"
                                    size="small"
                                />
                            </Box>
                        )}
                        </>
                    )}
                </PageContainer>
            )}

            {/* Add / Edit Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle fontWeight={500}>{editId ? ui.editStaffTitle : ui.addStaffTitle}</DialogTitle>
                <DialogContent>
                    <Box className="flex flex-col gap-4 pt-2">
                        {/* Photo upload area */}
                        <Box className="flex flex-col items-center gap-2">
                            <Box className="relative">
                                <Avatar
                                    src={form.photoUrl || undefined}
                                    sx={{ width: 96, height: 96, bgcolor: 'primary.main', fontSize: 36, fontWeight: 700 }}
                                >
                                    {!form.photoUrl && (form.name ? form.name.charAt(0).toUpperCase() : <PersonIcon />)}
                                </Avatar>
                                {photoUploading && (
                                    <Box className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                                        <CircularProgress size={28} sx={{ color: 'white' }} />
                                    </Box>
                                )}
                                {form.photoUrl && (
                                    <IconButton
                                        size="small"
                                        onClick={() => setForm((p) => ({ ...p, photoUrl: '' }))}
                                        sx={{ position: 'absolute', top: -4, right: -4, bgcolor: 'error.main', color: 'white', '&:hover': { bgcolor: 'error.dark' }, width: 24, height: 24 }}
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
                                onChange={handlePhotoUpload}
                            />
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<PhotoCameraIcon />}
                                onClick={() => fileInputRef.current?.click()}
                                disabled={photoUploading}
                            >
                                {form.photoUrl ? 'Ganti Foto' : 'Upload Foto'}
                            </Button>
                            <Typography variant="caption" color="text.secondary">
                                Format JPG/PNG, maks. 2MB
                            </Typography>
                        </Box>

                        <TextField
                            fullWidth
                            label={ui.staffNameFieldLabel}
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                        <TextField
                            fullWidth
                            label="Spesialisasi (opsional)"
                            value={form.specialty}
                            onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                            placeholder={ui.specialtyPlaceholder}
                        />
                        <TextField
                            fullWidth
                            label="No. HP / WA (opsional — untuk akun login staff)"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
                            inputMode="tel"
                            placeholder="08xx xxxx xxxx"
                            helperText={editId ? 'Kosongkan jika tidak ingin mengubah HP' : 'Jika diisi, staff bisa login via OTP WA'}
                        />
                        <TextField
                            fullWidth
                            type="number"
                            label="Kuota antrian aktif per hari (opsional)"
                            value={form.dailyBookingQuota}
                            onChange={(e) => {
                                const v = e.target.value.replace(/\D/g, '');
                                setForm((p) => ({
                                    ...p,
                                    dailyBookingQuota: v === '' ? '' : String(Math.min(9999, parseInt(v, 10))),
                                }));
                            }}
                            inputProps={{ min: 1, max: 9999 }}
                            placeholder="Ikuti batas outlet saja"
                            helperText="Kosong = tidak ada batas khusus untuk staff ini (tetap terbatas kuota outlet jika di-set)."
                        />

                        <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2, mt: 1 }}>
                            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                Jadwal jam tersedia (opsional)
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                                Kosongkan semua untuk tidak membatasi hari. Jika diisi, pelanggan hanya bisa membooking pada hari
                                dan rentang jam yang di-set (zona waktu kuota server). Format waktu sesuai jam lokal layar (24 jam).
                            </Typography>
                            <Button
                                size="small"
                                variant="text"
                                color="inherit"
                                sx={{ mb: 1 }}
                                onClick={() => setWeeklySchedule(emptyWeeklySchedule())}
                            >
                                Hapus semua jadwal
                            </Button>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 320, overflow: 'auto', pr: 0.5 }}>
                                {STAFF_DAY_ROWS.map(({ key, label }) => (
                                    <Box key={key}>
                                        <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" sx={{ mb: 0.75 }}>
                                            {label}
                                        </Typography>
                                        {weeklySchedule[key].length === 0 ? (
                                            <Button
                                                size="small"
                                                startIcon={<AddIcon />}
                                                variant="outlined"
                                                onClick={() =>
                                                    setWeeklySchedule((prev) => ({
                                                        ...prev,
                                                        [key]: [{ start: '09:00', end: '17:00' }],
                                                    }))}
                                            >
                                                Tambah jendela
                                            </Button>
                                        ) : (
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                {weeklySchedule[key].map((win, idx) => (
                                                    <Box key={`${key}-${idx}`} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                                                        <TextField
                                                            size="small"
                                                            type="time"
                                                            label="Mulai"
                                                            value={win.start}
                                                            onChange={(e) => {
                                                                const v = e.target.value;
                                                                setWeeklySchedule((prev) => {
                                                                    const next = [...prev[key]];
                                                                    next[idx] = { ...next[idx], start: v };
                                                                    return { ...prev, [key]: next };
                                                                });
                                                            }}
                                                            InputLabelProps={{ shrink: true }}
                                                            inputProps={{ step: 300 }}
                                                        />
                                                        <TextField
                                                            size="small"
                                                            type="time"
                                                            label="Selesai"
                                                            value={win.end}
                                                            onChange={(e) => {
                                                                const v = e.target.value;
                                                                setWeeklySchedule((prev) => {
                                                                    const next = [...prev[key]];
                                                                    next[idx] = { ...next[idx], end: v };
                                                                    return { ...prev, [key]: next };
                                                                });
                                                            }}
                                                            InputLabelProps={{ shrink: true }}
                                                            inputProps={{ step: 300 }}
                                                        />
                                                        <IconButton
                                                            size="small"
                                                            aria-label="Hapus jendela"
                                                            onClick={() =>
                                                                setWeeklySchedule((prev) => ({
                                                                    ...prev,
                                                                    [key]: prev[key].filter((_, i) => i !== idx),
                                                                }))}
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Box>
                                                ))}
                                                <Button
                                                    size="small"
                                                    startIcon={<AddIcon />}
                                                    onClick={() =>
                                                        setWeeklySchedule((prev) => ({
                                                            ...prev,
                                                            [key]: [...prev[key], { start: '09:00', end: '12:00' }],
                                                        }))}
                                                >
                                                    Jendela lagi
                                                </Button>
                                            </Box>
                                        )}
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions className="p-4 gap-2">
                    <Button onClick={() => setDialogOpen(false)} variant="outlined" fullWidth>Batal</Button>
                    <Button onClick={handleSave} variant="contained" fullWidth disabled={saving}>
                        {saving ? <CircularProgress size={20} color="inherit" /> : 'Simpan'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirm */}
            <Dialog open={!!deleteId} onClose={() => !deleting && setDeleteId(null)} maxWidth="xs" fullWidth>
                <DialogTitle fontWeight={500}>{ui.deleteStaffTitle}</DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary">
                        Profil {ui.staffSingular.toLowerCase()} ini akan dihapus permanen dari database. Tindakan ini tidak dapat dikembalikan.
                    </Typography>
                </DialogContent>
                <DialogActions className="p-4 gap-2">
                    <Button onClick={() => setDeleteId(null)} variant="outlined" fullWidth disabled={deleting}>
                        Batal
                    </Button>
                    <Button onClick={() => void handleDelete()} variant="contained" color="error" fullWidth disabled={deleting}>
                        {deleting ? <CircularProgress size={20} color="inherit" /> : 'Hapus permanen'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Import Staff Dialog */}
            <Dialog open={importDialog.open} onClose={() => !importing && setImportDialog({ open: false, rows: [], errors: [], duplicates: [] })} fullWidth maxWidth="xs">
                <DialogTitle fontWeight={500}>Konfirmasi Import {ui.staffSingular}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" gutterBottom>
                        <strong>{importDialog.rows.length}</strong> {ui.staffSingular.toLowerCase()} baru siap diimport.
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
                            </List>
                        </Box>
                    )}
                    <List dense disablePadding sx={{ maxHeight: 200, overflow: 'auto' }}>
                        {importDialog.rows.slice(0, 20).map((r, i) => (
                            <ListItem key={i} disablePadding>
                                <ListItemText
                                    primary={r.name}
                                    secondary={[r.specialty, r.phone].filter(Boolean).join(' · ') || '—'}
                                    primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                                    secondaryTypographyProps={{ variant: 'caption' }}
                                />
                            </ListItem>
                        ))}
                        {importDialog.rows.length > 20 && (
                            <ListItem disablePadding>
                                <ListItemText primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }} primary={`… dan ${importDialog.rows.length - 20} lainnya`} />
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
                        {importing ? <CircularProgress size={20} color="inherit" /> : importDialog.rows.length === 0 ? 'Tidak ada data baru' : `Import ${importDialog.rows.length} ${ui.staffSingular}`}
                    </Button>
                </DialogActions>
            </Dialog>

            <TenantAdminBottomNav />
        </AppPageShell>
    );
}
