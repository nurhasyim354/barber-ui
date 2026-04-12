'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box, Card, CardContent, Typography, Button, CircularProgress,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Avatar, IconButton, Chip, Switch, Rating,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
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

export default function BarbersPage() {
    const { user, isLoading, loadFromStorage, logout } = useAuthStore();
    const router = useRouter();

    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState(defaultForm);
    const [editId, setEditId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

    useEffect(() => {
        if (isLoading) return;
        if (!user) { router.replace('/login'); return; }
        if (user.role !== 'tenant_admin') { router.replace('/dashboard'); return; }
        loadBarbers();
    }, [user, isLoading]);

    const loadBarbers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/barbers');
            setBarbers(res.data);
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
                await api.patch(`/barbers/${editId}`, form);
                toast.success('Barber diupdate');
            } else {
                await api.post('/barbers', form);
                toast.success('Barber berhasil ditambahkan');
            }
            setDialogOpen(false);
            loadBarbers();
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
            loadBarbers();
        } catch {
            toast.error('Gagal update status');
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/barbers/${deleteId}`);
            toast.success('Barber dihapus');
            setDeleteId(null);
            loadBarbers();
        } catch {
            toast.error('Gagal menghapus barber');
        }
    };

    return (
        <Box className="min-h-screen bg-gray-50 pb-24">
            <PageHeader
                title="Tim Barber"
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
                        <Box className="flex flex-col gap-3">
                            {barbers.map((b) => (
                                <Card key={b._id} className={!b.isActive ? 'opacity-60' : ''}>
                                    <CardContent>
                                        <Box className="flex items-center gap-3">
                                            <Avatar
                                                src={b.photoUrl}
                                                sx={{ width: 68, height: 68, bgcolor: 'primary.main', fontSize: 28, fontWeight: 700 }}
                                            >
                                                {!b.photoUrl && b.name.charAt(0).toUpperCase()}
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
                    )}
                </Box>
            )}

            {/* Add / Edit Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle fontWeight={700}>{editId ? 'Edit Barber' : 'Tambah Barber'}</DialogTitle>
                <DialogContent>
                    <Box className="flex flex-col gap-4 pt-2">
                        {form.photoUrl && (
                            <Box className="flex justify-center">
                                <Avatar src={form.photoUrl} sx={{ width: 88, height: 88 }} />
                            </Box>
                        )}
                        <TextField
                            fullWidth
                            label="Nama Barber *"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                        <TextField
                            fullWidth
                            label="URL Foto (opsional)"
                            value={form.photoUrl}
                            onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
                            placeholder="https://..."
                            helperText="Link gambar profil barber"
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
