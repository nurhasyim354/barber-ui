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
  /** Jika diisi, dipanggil saat tombol kembali diklik; default `router.back()`. */
  onBack?: () => void;
  right?: React.ReactNode;
}

export default function PageHeader({ title, back, onBack, right }: Props) {
  const router = useRouter();
  return (
    <AppBar position="sticky" color="primary" elevation={0}>
      <Toolbar>
        {back && (
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => (onBack ? onBack() : router.back())}
          >
            <ArrowBackIcon />
          </IconButton>
        )}
        <Typography
          variant="h6"
          component="h1"
          className="flex-1 font-bold"
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
