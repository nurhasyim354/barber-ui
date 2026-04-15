'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, CircularProgress,
  Avatar, TextField, InputAdornment, IconButton, Chip, Pagination,
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

const PAGE_SIZE = 3;

export default function CustomersPage() {
  const { user, isLoading, loadFromStorage } = useAuthStore();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role === 'customer') { router.replace('/booking'); return; }
    loadCustomers(1, search);
  }, [user, isLoading]);

  const loadCustomers = useCallback(async (p: number, q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
      if (q) params.set('search', q);
      const res = await api.get(`/customers?${params}`);
      setCustomers(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      setPage(p);
    } catch {
      toast.error('Gagal memuat pelanggan');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => {
    setSearch(searchInput);
    loadCustomers(1, searchInput);
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    loadCustomers(value, search);
  };

  const handleToggleActive = async (c: Customer) => {
    try {
      await api.patch(`/customers/${c._id}`, { isActive: !c.isActive });
      toast.success(`${c.name} ${c.isActive ? 'dinonaktifkan' : 'diaktifkan'}`);
      loadCustomers(page, search);
    } catch {
      toast.error('Gagal mengubah status');
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Box className="min-h-screen bg-gray-50 pb-24">
      <PageHeader title={`Pelanggan (${total})`} />

      <Box className="p-4 max-w-lg mx-auto">
        <Box className="flex gap-2 mb-4">
          <TextField
            fullWidth
            placeholder="Cari nama atau nomor HP..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
          <IconButton onClick={handleSearch} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, px: 2 }}>
            <SearchIcon />
          </IconButton>
        </Box>

        {loading ? (
          <Box className="flex justify-center mt-8"><CircularProgress /></Box>
        ) : customers.length === 0 ? (
          <Box className="text-center py-12">
            <Typography color="text.secondary">
              {search ? 'Pelanggan tidak ditemukan' : 'Belum ada pelanggan'}
            </Typography>
          </Box>
        ) : (
          <>
            <Box className="flex flex-col gap-3 mb-4">
              {customers.map((c) => (
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

            {totalPages > 1 && (
              <Box className="flex justify-center mt-2">
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  size="small"
                />
              </Box>
            )}
          </>
        )}
      </Box>

      <TenantAdminBottomNav />
    </Box>
  );
}
