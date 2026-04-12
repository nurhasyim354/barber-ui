'use client';
import { usePathname, useRouter } from 'next/navigation';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import HistoryIcon from '@mui/icons-material/History';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PersonIcon from '@mui/icons-material/Person';
import { useAuthStore } from '@/store/authStore';

export function CustomerBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();

  const value = pathname.startsWith('/history') ? 1 : 0;

  return (
    <Paper elevation={8} className="fixed bottom-0 left-0 right-0 safe-bottom z-50">
      <BottomNavigation
        value={value}
        onChange={(_, v) => {
          if (v === 0) router.push('/booking');
          else if (v === 1) router.push('/history');
          else { logout(); router.push('/login'); }
        }}
        showLabels
      >
        <BottomNavigationAction label="Booking" icon={<ContentCutIcon />} />
        <BottomNavigationAction label="Riwayat" icon={<HistoryIcon />} />
        <BottomNavigationAction label="Keluar" icon={<LogoutIcon />} />
      </BottomNavigation>
    </Paper>
  );
}

export function TenantAdminBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();

  const routes = ['/dashboard', '/pos', '/barbers', '/customers', '/services'];
  const value = routes.findIndex((r) => pathname.startsWith(r));

  return (
    <Paper elevation={8} className="fixed bottom-0 left-0 right-0 safe-bottom z-50">
      <BottomNavigation
        value={value === -1 ? 0 : value}
        onChange={(_, v) => {
          const r = routes[v];
          if (r) router.push(r);
        }}
        showLabels
      >
        <BottomNavigationAction label="Dashboard" icon={<DashboardIcon />} />
        <BottomNavigationAction label="POS" icon={<ReceiptIcon />} />
        <BottomNavigationAction label="Barber" icon={<PersonIcon />} />
        <BottomNavigationAction label="Pelanggan" icon={<PeopleIcon />} />
        <BottomNavigationAction label="Layanan" icon={<ContentCutIcon />} />
      </BottomNavigation>
    </Paper>
  );
}
