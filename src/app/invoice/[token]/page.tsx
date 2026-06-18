'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import {
  Box, Button, CircularProgress, Container, Typography, Alert, ThemeProvider, createTheme,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import {
  buildThermalReceiptBodyInnerHtml,
  buildThermalReceiptPrintHtmlDocument,
  type ThermalReceipt,
} from '@/lib/thermalReceiptPrint';

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://bookita.nh-apps.com/api';

/** Theme netral — invoice publik tidak mengikuti theme tenant. */
const invoiceTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2563eb' },
    text: { primary: '#111827', secondary: '#4b5563' },
    background: { default: '#f3f4f6', paper: '#ffffff' },
  },
});

export default function PublicInvoicePage() {
  const params = useParams();
  const token = typeof params.token === 'string' ? params.token : '';

  const [receipt, setReceipt] = useState<ThermalReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Tautan invoice tidak valid');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get<ThermalReceipt>(`${apiBase}/public/invoices/${encodeURIComponent(token)}`);
        if (!cancelled) setReceipt(res.data);
      } catch {
        if (!cancelled) setError('Invoice tidak ditemukan atau sudah tidak berlaku.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const receiptPrintOpts = { assigneeLabel: 'Staff' as const };

  const handlePrint = () => {
    if (!receipt) return;
    const html = buildThermalReceiptPrintHtmlDocument(receipt, receiptPrintOpts);
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <ThemeProvider theme={invoiceTheme}>
      <Box sx={{ minHeight: '100svh', bgcolor: 'background.default', py: 4 }}>
        <Container maxWidth="sm">
          <Typography variant="h5" fontWeight={600} textAlign="center" gutterBottom sx={{ color: '#111827' }}>
            Invoice
          </Typography>
          {loading && (
            <Box display="flex" justifyContent="center" py={6}>
              <CircularProgress />
            </Box>
          )}
          {!loading && error && (
            <Alert severity="error">{error}</Alert>
          )}
          {!loading && receipt && (
            <>
              <Box
                sx={{
                  bgcolor: '#ffffff',
                  borderRadius: 2,
                  boxShadow: 1,
                  p: 2,
                  mx: 'auto',
                  maxWidth: 320,
                  fontFamily: '"Courier New", monospace',
                  fontSize: 11,
                  lineHeight: 1.35,
                  color: '#111827',
                  '& .center': { textAlign: 'center' },
                  '& .bold': { fontWeight: 'bold', color: '#111827' },
                  '& .large': { fontSize: 14, color: '#111827' },
                  '& .divider': { borderTop: '1px dashed #000', my: 0.5 },
                  '& .row': { display: 'flex', justifyContent: 'space-between', gap: 1, fontSize: 10, color: '#111827' },
                }}
                dangerouslySetInnerHTML={{
                  __html: buildThermalReceiptBodyInnerHtml(receipt, receiptPrintOpts),
                }}
              />
              <Button
                fullWidth
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={handlePrint}
                sx={{ mt: 2 }}
              >
                Cetak
              </Button>
            </>
          )}
        </Container>
      </Box>
    </ThemeProvider>
  );
}
