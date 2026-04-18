'use client';
import { usePathname, useRouter } from 'next/navigation';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import ContentCutIcon from '@mui/icons-material/EditCalendar';
import HistoryIcon from '@mui/icons-material/History';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PersonIcon from '@mui/icons-material/Person';
import ListAltIcon from '@mui/icons-material/ListAlt';
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
        sx={{
          '& .MuiBottomNavigationAction-label': {
            fontSize: { xs: '0.65rem', sm: '0.75rem' },
            opacity: 1,
          },
          '& .MuiBottomNavigationAction-root': { minWidth: { xs: 0, sm: 80 }, px: { xs: 0.5, sm: 1 } },
        }}
      >
        <BottomNavigationAction label="Booking" icon={<ContentCutIcon />} />
        <BottomNavigationAction label="Riwayat" icon={<HistoryIcon />} />
        <BottomNavigationAction label="Keluar" icon={<LogoutIcon />} />
      </BottomNavigation>
    </Paper>
  );
}

export function BarberBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();

  const routes = ['/barber', '/barber/history'];
  const value = routes.findIndex((r) => pathname === r || pathname.startsWith(r + '/'));

  return (
    <Paper elevation={8} className="fixed bottom-0 left-0 right-0 safe-bottom z-50">
      <BottomNavigation
        value={value === -1 ? 0 : value}
        onChange={(_, v) => {
          if (v === 0) router.push('/barber');
          else if (v === 1) router.push('/barber/history');
          else { logout(); router.push('/login'); }
        }}
        showLabels
        sx={{
          '& .MuiBottomNavigationAction-label': {
            fontSize: { xs: '0.65rem', sm: '0.75rem' },
            opacity: 1,
          },
          '& .MuiBottomNavigationAction-root': { minWidth: { xs: 0, sm: 80 }, px: { xs: 0.5, sm: 1 } },
        }}
      >
        <BottomNavigationAction label="Antrian" icon={<ListAltIcon />} />
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
        sx={{
          '& .MuiBottomNavigationAction-label': {
            fontSize: { xs: '0.6rem', sm: '0.7rem' },
            opacity: 1,
            whiteSpace: { xs: 'nowrap', md: 'normal' },
          },
          '& .MuiBottomNavigationAction-root': { minWidth: { xs: 0, sm: 64, md: 80 }, px: { xs: 0.25, sm: 0.5 } },
        }}
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
