'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, CircularProgress,
  Avatar, TextField, InputAdornment, IconButton, Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PhoneIcon from '@mui/icons-material/Phone';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import { TenantAdminBottomNav } from '@/components/layout/BottomNav';

interface Customer {
  _id: string;
  name: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
}

export default function CustomersPage() {
  const { user, isLoading, loadFromStorage } = useAuthStore();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filtered, setFiltered] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role === 'customer') { router.replace('/booking'); return; }
    loadCustomers();
  }, [user, isLoading]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      customers.filter(
        (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
      )
    );
  }, [search, customers]);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
      setFiltered(res.data);
    } catch {
      toast.error('Gagal memuat pelanggan');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggleActive = async (c: Customer) => {
    try {
      await api.patch(`/customers/${c._id}`, { isActive: !c.isActive });
      toast.success(`${c.name} ${c.isActive ? 'dinonaktifkan' : 'diaktifkan'}`);
      loadCustomers();
    } catch {
      toast.error('Gagal mengubah status');
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Box className="min-h-screen bg-gray-50 pb-24">
      <PageHeader title={`Pelanggan (${customers.length})`} />

      <Box className="p-4 max-w-lg mx-auto">
        <TextField
          fullWidth
          placeholder="Cari nama atau nomor HP..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4"
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />

        {loading ? (
          <Box className="flex justify-center mt-8"><CircularProgress /></Box>
        ) : filtered.length === 0 ? (
          <Box className="text-center py-12">
            <Typography color="text.secondary">
              {search ? 'Pelanggan tidak ditemukan' : 'Belum ada pelanggan'}
            </Typography>
          </Box>
        ) : (
          <Box className="flex flex-col gap-3">
            {filtered.map((c) => (
              <Card key={c._id} className={c.isActive ? '' : 'opacity-60'}>
                <CardContent className="flex items-center gap-3">
                  <Avatar
                    sx={{
                      bgcolor: c.isActive ? 'primary.main' : 'grey.400',
                      width: 48,
                      height: 48,
                      fontWeight: 700,
                    }}
                  >
                    {getInitials(c.name)}
                  </Avatar>
                  <Box className="flex-1">
                    <Box className="flex items-center gap-2">
                      <Typography fontWeight={700}>{c.name}</Typography>
                      {!c.isActive && <Chip label="Nonaktif" size="small" color="error" />}
                    </Box>
                    <Box className="flex items-center gap-1">
                      <PhoneIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {c.phone}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.disabled">
                      Bergabung {new Date(c.createdAt).toLocaleDateString('id-ID')}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => handleToggleActive(c)}
                    title={c.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  >
                    {c.isActive ? (
                      <BlockIcon color="error" fontSize="small" />
                    ) : (
                      <CheckCircleIcon color="success" fontSize="small" />
                    )}
                  </IconButton>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>

      <TenantAdminBottomNav />
    </Box>
  );
}
