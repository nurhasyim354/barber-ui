'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Alert, CircularProgress } from '@mui/material';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

function mapMeToAuthUser(u: Record<string, unknown>, prevTenantType?: string | null) {
  return {
    _id: String(u._id),
    phone: String(u.phone ?? ''),
    pendingPhone: (u.pendingPhone as string | null | undefined) ?? null,
    name: String(u.name ?? ''),
    role: u.role as 'tenant_admin' | 'staff',
    tenantId: (u.tenantId as string | null | undefined) ?? null,
    staffId: (u.staffId as string | null | undefined) ?? null,
    isOverdue: Boolean(u.isOverdue),
    tenantType: (u.tenantType as string | null | undefined) ?? prevTenantType ?? null,
  };
}

type PhoneChangeSectionProps = {
  /** Sembunyikan judul & paragraf pengantar (mis. saat dipakai di Accordion) */
  hideIntro?: boolean;
};

export default function PhoneChangeSection({ hideIntro = false }: PhoneChangeSectionProps) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const [newPhone, setNewPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [meLoading, setMeLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setMeLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/auth/me');
        const u = res.data.user as Record<string, unknown>;
        if (!cancelled) {
          const { user: prev, setAuth } = useAuthStore.getState();
          const mapped = mapMeToAuthUser(u, prev?.tenantType);
          const unchanged =
            prev &&
            mapped.phone === prev.phone &&
            mapped.pendingPhone === (prev.pendingPhone ?? null) &&
            mapped.name === prev.name &&
            mapped.tenantId === prev.tenantId &&
            mapped.staffId === prev.staffId;
          if (!unchanged) setAuth(mapped, token);
        }
      } catch {
        /* biarkan data dari login */
      } finally {
        if (!cancelled) setMeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!user || (user.role !== 'tenant_admin' && user.role !== 'staff')) return null;

  const refreshProfile = async () => {
    if (!token) return;
    try {
      const res = await api.get('/auth/me');
      const u = res.data.user as Record<string, unknown>;
      const { setAuth } = useAuthStore.getState();
      setAuth(mapMeToAuthUser(u, user?.tenantType), token);
    } catch {
      /* ignore */
    }
  };

  const handleSubmit = async () => {
    const digits = newPhone.replace(/\D/g, '');
    if (digits.length < 9) {
      toast.error('Nomor baru tidak valid');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/auth/request-phone-change', { newPhone: digits });
      toast.success(res.data.message);
      if (res.data.verifyUrlDev) {
        toast(String(res.data.verifyUrlDev), { duration: 25000 });
      }
      setNewPhone('');
      await refreshProfile();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Gagal mengirim tautan',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {!hideIntro ? (
        <>
          <Typography variant="subtitle1" fontWeight={500}>
            Nomor WhatsApp untuk masuk
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Perubahan nomor memerlukan konfirmasi lewat tautan yang dikirim ke nomor baru. Nomor login tidak berubah sebelum Anda
            membuka tautan tersebut.
          </Typography>
        </>
      ) : null}
      {user.pendingPhone ? (
        <Alert severity="info">
          Menunggu verifikasi: <strong>{user.pendingPhone}</strong>. Buka tautan di WhatsApp nomor tersebut. Setelah berhasil,
          masuk lagi dengan nomor baru.
        </Alert>
      ) : null}
      <TextField
        size="small"
        label="Nomor saat ini (login)"
        value={meLoading ? '…' : user.phone}
        disabled
        fullWidth
      />
      <TextField
        label="Nomor WhatsApp baru"
        value={newPhone}
        onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ''))}
        fullWidth
        inputMode="tel"
        placeholder="08…"
      />
      <Button variant="outlined" onClick={() => void handleSubmit()} disabled={submitting || !newPhone || meLoading}>
        {submitting ? <CircularProgress size={22} /> : 'Kirim tautan verifikasi ke nomor baru'}
      </Button>
    </Box>
  );
}
