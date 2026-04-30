'use client';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/navigation';

interface Props {
  title: string;
  back?: boolean;
  /** Navigasi eksplisit menggantikan router.back() */
  backHref?: string;
  /** Handler kustom menggantikan back / backHref (mis. wizard langkah) */
  onBack?: () => void;
  right?: React.ReactNode;
}

export default function PageHeader({ title, back, backHref, onBack, right }: Props) {
  const router = useRouter();
  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (backHref) {
      router.push(backHref);
      return;
    }
    router.back();
  };
  return (
    <AppBar position="sticky" color="transparent" elevation={0}>
      <Toolbar>
        {back && (
          <IconButton edge="start" color="inherit" onClick={handleBack} aria-label="Kembali">
            <ArrowBackIcon />
          </IconButton>
        )}
        <Typography
          variant="h6"
          component="h1"
          className="flex-1 font-semibold"
          noWrap
          sx={{ minWidth: 0, fontSize: { xs: '1rem', sm: '1.25rem' } }}
        >
          {title}
        </Typography>
        {right}
      </Toolbar>
    </AppBar>
  );
}
