'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, CircularProgress,
  Avatar, TextField, InputAdornment, IconButton, Chip, Pagination,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PhoneIcon from '@mui/icons-material/Phone';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { exportWorkbook, parseExcelFile } from '@/lib/excelUtils';
import { useAuthStore } from '@/store/authStore';
import PageHeader from '@/components/layout/PageHeader';
import AppPageShell from '@/components/layout/AppPageShell';
import PageContainer from '@/components/layout/PageContainer';
import { TenantAdminBottomNav } from '@/components/layout/BottomNav';

interface Customer {
  _id: string;
  name: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
}

const PAGE_SIZE = 20;

export default function CustomersPage() {
  const { user, isLoading, loadFromStorage, logout } = useAuthStore();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const importFileRef = useRef<HTMLInputElement>(null);
  type ImportRow = { name: string; phone: string };
  const [importDialog, setImportDialog] = useState<{ open: boolean; rows: ImportRow[]; errors: string[]; duplicates: string[] }>({ open: false, rows: [], errors: [], duplicates: [] });
  const [importing, setImporting] = useState(false);

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

  const handleExportCustomers = async () => {
    try {
      const res = await api.get(`/customers?page=1&limit=10000`);
      const all: Customer[] = res.data.data;
      if (all.length === 0) { toast.error('Tidak ada pelanggan untuk diekspor'); return; }
      exportWorkbook([{
        name: 'Pelanggan',
        rows: all.map((c) => ({
          'Nama': c.name,
          'No. HP': c.phone,
          'Status': c.isActive ? 'Aktif' : 'Nonaktif',
          'Bergabung': new Date(c.createdAt).toLocaleDateString('id-ID'),
        })),
      }], 'pelanggan');
      toast.success('File Excel berhasil diunduh');
    } catch {
      toast.error('Gagal mengekspor data');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      // Ambil semua pelanggan untuk cek duplikat HP dan nama
      const allRes = await api.get('/customers?limit=10000');
      const allCustomers: { name: string; phone: string }[] = allRes.data.data;
      const existingPhones = new Set(allCustomers.map((c) => c.phone).filter(Boolean));
      const existingNames = new Set(allCustomers.map((c) => c.name.toLowerCase()));

      const rawRows = await parseExcelFile(file);
      const rows: ImportRow[] = [];
      const errors: string[] = [];
      const duplicates: string[] = [];
      const batchPhones = new Set<string>();
      const batchNames = new Set<string>();

      rawRows.forEach((r, idx) => {
        const rowNum = idx + 2;
        const name = String(r['Nama'] ?? '').trim();
        if (!name) { errors.push(`Baris ${rowNum}: Nama wajib diisi`); return; }
        const phone = String(r['No. HP'] ?? '').replace(/\D/g, '');

        // Cek duplikat berdasarkan HP (jika ada HP) atau nama (jika tidak ada HP)
        if (phone.length >= 10) {
          if (existingPhones.has(phone) || batchPhones.has(phone)) {
            duplicates.push(`${name} (${phone})`);
            return;
          }
          batchPhones.add(phone);
        } else {
          const nameLower = name.toLowerCase();
          if (existingNames.has(nameLower) || batchNames.has(nameLower)) {
            duplicates.push(name);
            return;
          }
          batchNames.add(nameLower);
        }

        rows.push({ name, phone });
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
        await api.post('/customers', { name: row.name, phone: row.phone || undefined });
        ok++;
      } catch { fail++; }
    }
    setImporting(false);
    setImportDialog({ open: false, rows: [], errors: [], duplicates: [] });
    toast.success(`Import selesai: ${ok} berhasil${fail > 0 ? `, ${fail} gagal` : ''}${importDialog.duplicates.length > 0 ? `, ${importDialog.duplicates.length} duplikat dilewati` : ''}`);
    loadCustomers(1, search);
  };

  const handleDownloadTemplate = () => {
    exportWorkbook([{
      name: 'Pelanggan',
      rows: [{ 'Nama': 'Budi Santoso', 'No. HP': '08123456789' }],
    }], 'template_pelanggan');
  };

  return (
    <AppPageShell variant="withBottomNav">
      <input ref={importFileRef} type="file" accept=".xlsx,.xls" hidden onChange={handleImportFile} />

      <PageHeader title={`Pelanggan (${total})`}
        right={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton color="inherit" size="small" onClick={() => void handleExportCustomers()} title="Export Excel">
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

      <PageContainer>
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
                        <Typography fontWeight={500}>{c.name}</Typography>
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
      </PageContainer>

      {/* Import Dialog */}
      <Dialog open={importDialog.open} onClose={() => !importing && setImportDialog({ open: false, rows: [], errors: [], duplicates: [] })} fullWidth maxWidth="xs">
        <DialogTitle fontWeight={500}>Konfirmasi Import Pelanggan</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            <strong>{importDialog.rows.length}</strong> pelanggan baru siap diimport.
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
                  secondary={r.phone || '—'}
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
            {importing ? <CircularProgress size={20} color="inherit" /> : importDialog.rows.length === 0 ? 'Tidak ada data baru' : `Import ${importDialog.rows.length} Pelanggan`}
          </Button>
        </DialogActions>
      </Dialog>

      <TenantAdminBottomNav />
    </AppPageShell>
  );
}
