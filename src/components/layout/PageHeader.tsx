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
  right?: React.ReactNode;
}

export default function PageHeader({ title, back, right }: Props) {
  const router = useRouter();
  return (
    <AppBar position="sticky" color="primary" elevation={0}>
      <Toolbar>
        {back && (
          <IconButton edge="start" color="inherit" onClick={() => router.back()}>
            <ArrowBackIcon />
          </IconButton>
        )}
        <Typography variant="h6" className="flex-1 font-bold">
          {title}
        </Typography>
        {right}
      </Toolbar>
    </AppBar>
  );
}
