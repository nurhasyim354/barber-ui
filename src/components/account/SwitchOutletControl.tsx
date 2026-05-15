'use client';

import { useEffect, useState } from 'react';
import { CircularProgress, IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore, type AuthUser } from '@/store/authStore';

export interface SwitchOutletControlProps {
  onSwitched?: () => void;
}

interface SwitchableTenantRow {
  tenantId: string;
  name: string;
  current: boolean;
}

export default function SwitchOutletControl({ onSwitched }: SwitchOutletControlProps) {
  const { user, setAuth } = useAuthStore();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [rows, setRows] = useState<SwitchableTenantRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'customer') return;
    let cancelled = false;
    setLoading(true);
    api
      .get<SwitchableTenantRow[]>('/auth/my-switchable-tenants')
      .then((res) => {
        if (!cancelled && Array.isArray(res.data)) setRows(res.data);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user || user.role !== 'customer') return null;

  const choices = rows.filter((r) => !r.current);
  if (!loading && rows.length <= 1) return null;

  const open = Boolean(anchor);

  const handlePick = async (tenantId: string) => {
    setSwitching(true);
    try {
      const res = await api.post<{ token: string; user: AuthUser }>('/auth/switch-tenant', { tenantId });
      setAuth(res.data.user, res.data.token);
      setAnchor(null);
      toast.success('Outlet aktif diperbarui');
      onSwitched?.();
    } catch {
      toast.error('Gagal ganti outlet');
    } finally {
      setSwitching(false);
    }
  };

  return (
    <>
      <Tooltip title="Ganti outlet">
        <span>
          <IconButton
            color="inherit"
            size="small"
            onClick={(e) => setAnchor(e.currentTarget)}
            disabled={loading || choices.length === 0}
            aria-label="Ganti outlet"
          >
            {loading ? <CircularProgress size={18} color="inherit" /> : <StorefrontIcon />}
          </IconButton>
        </span>
      </Tooltip>
      <Menu anchorEl={anchor} open={open} onClose={() => setAnchor(null)}>
        {rows.map((r) => (
          <MenuItem
            key={r.tenantId}
            disabled={r.current || switching}
            onClick={() => void handlePick(r.tenantId)}
          >
            {r.name}
            {r.current ? ' (aktif)' : ''}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
