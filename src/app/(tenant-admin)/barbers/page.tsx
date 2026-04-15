'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box, Card, CardContent, Typography, Button, CircularProgress,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Avatar, IconButton, Chip, Switch, Rating, Pagination,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ClearIcon from '@mui/icons-material/Clear';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import { TenantAdminBottomNav } from '@/components/layout/BottomNav';

interface Barber {
    _id: string;
    name: string;
    photoUrl?: string;
    specialty?: string;
    rating: number;
    reviewCount: number;
    isActive: boolean;
}

const defaultForm = { name: '', photoUrl: '', specialty: '' };
const PAGE_SIZE = 20;

export default function BarbersPage() {
    const { user, isLoading, loadFromStorage, logout } = useAuthStore();
    const router = useRouter();

    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState(defaultForm);
    const [editId, setEditId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [photoUploading, setPhotoUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

    useEffect(() => {
        if (isLoading) return;
        if (!user) { router.replace('/login'); return; }
        if (user.role !== 'tenant_admin') { router.replace('/dashboard'); return; }
        loadBarbers();
    }, [user, isLoading]);

    const loadBarbers = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const res = await api.get(`/barbers?page=${p}&limit=${PAGE_SIZE}`);
            setBarbers(res.data.data);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
            setPage(p);
        } catch {
            toast.error('Gagal memuat data barber');
        } finally {
            setLoading(false);
        }
    }, []);

    const openAdd = () => {
        setForm(defaultForm);
        setEditId(null);
        setDialogOpen(true);
    };

    const handleEdit = (b: Barber) => {
        setForm({ name: b.name, photoUrl: b.photoUrl || '', specialty: b.specialty || '' });
        setEditId(b._id);
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) { toast.error('Nama wajib diisi'); return; }
        setSaving(true);
        try {
            if (editId) {
                await api.patch(`/barbers/${editId}`, { ...form, isActive: true });
                toast.success('Barber diupdate');
            } else {
                await api.post('/barbers', form);
                toast.success('Barber berhasil ditambahkan');
            }
            setDialogOpen(false);
            loadBarbers(page);
        } catch {
            toast.error('Gagal menyimpan data barber');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (b: Barber) => {
        try {
            await api.patch(`/barbers/${b._id}`, { isActive: !b.isActive });
            toast.success(b.isActive ? 'Barber dinonaktifkan' : 'Barber diaktifkan');
            loadBarbers(page);
        } catch {
            toast.error('Gagal update status');
        }
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 1.5 * 1024 * 1024) {
            toast.error('Ukuran foto maksimal 1.5MB');
            return;
        }
        setPhotoUploading(true);
        const reader = new FileReader();
        reader.onload = () => {
            setForm((prev) => ({ ...prev, photoUrl: reader.result as string }));
            setPhotoUploading(false);
        };
        reader.onerror = () => {
            toast.error('Gagal membaca file foto');
            setPhotoUploading(false);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/barbers/${deleteId}`);
            toast.success('Barber dihapus');
            setDeleteId(null);
            loadBarbers(page);
        } catch {
            toast.error('Gagal menghapus barber');
        }
    };

    return (
        <Box className="min-h-screen bg-gray-50 pb-24">
            <PageHeader
                title={`Tim Barber (${total})`}
                right={
                    <Box className="flex items-center">
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
                <Box className="p-4 max-w-lg mx-auto">
                    {barbers.length === 0 ? (
                        <Card>
                            <CardContent className="text-center py-12">
                                <PersonIcon sx={{ fontSize: 72, color: 'text.disabled' }} />
                                <Typography variant="h6" color="text.secondary" className="mt-2">Belum ada barber</Typography>
                                <Typography variant="body2" color="text.disabled" className="mb-4">
                                    Tambahkan barber untuk memulai
                                </Typography>
                                <Button variant="contained" onClick={openAdd} startIcon={<AddIcon />}>
                                    Tambah Barber Pertama
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                        <Box className="flex flex-col gap-3">
                            {barbers.map((b) => (
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
                                                    <Typography fontWeight={700} variant="h6">{b.name}</Typography>
                                                    {!b.isActive && (
                                                        <Chip label="Nonaktif" size="small" color="default" />
                                                    )}
                                                </Box>
                                                {b.specialty && (
                                                    <Typography variant="body2" color="text.secondary">{b.specialty}</Typography>
                                                )}
                                                <Box className="flex items-center gap-1 mt-1">
                                                    <Rating value={b.rating || 0} precision={0.1} size="small" readOnly />
                                                    <Typography variant="body2" color="text.secondary">
                                                        {b.rating > 0
                                                            ? `${b.rating.toFixed(1)}${b.reviewCount > 0 ? ` (${b.reviewCount})` : ''}`
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
                                    onChange={(_, v) => loadBarbers(v)}
                                    color="primary"
                                    size="small"
                                />
                            </Box>
                        )}
                        </>
                    )}
                </Box>
            )}

            {/* Add / Edit Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle fontWeight={700}>{editId ? 'Edit Barber' : 'Tambah Barber'}</DialogTitle>
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
                            label="Nama Barber *"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                        <TextField
                            fullWidth
                            label="Spesialisasi (opsional)"
                            value={form.specialty}
                            onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                            placeholder="Contoh: Fade, Undercut, Classic Cut"
                        />
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
            <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
                <DialogTitle fontWeight={700}>Hapus Barber?</DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary">Data barber akan dihapus permanen.</Typography>
                </DialogContent>
                <DialogActions className="p-4 gap-2">
                    <Button onClick={() => setDeleteId(null)} variant="outlined" fullWidth>Batal</Button>
                    <Button onClick={handleDelete} variant="contained" color="error" fullWidth>Hapus</Button>
                </DialogActions>
            </Dialog>

            <TenantAdminBottomNav />
        </Box>
    );
}
