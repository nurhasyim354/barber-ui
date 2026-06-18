'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { Box, Button, CircularProgress, Container, Typography, Alert } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import {
  buildThermalReceiptBodyInnerHtml,
  buildThermalReceiptPrintHtmlDocument,
  getBrowserThermalPrintPageCss,
  type ThermalReceipt,
} from '@/lib/thermalReceiptPrint';

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://bookita.nh-apps.com/api';

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

  const handlePrint = () => {
    if (!receipt) return;
    const html = buildThermalReceiptPrintHtmlDocument(receipt, { assigneeLabel: 'Staff' });
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <Box sx={{ minHeight: '100svh', bgcolor: 'grey.100', py: 4 }}>
      <Container maxWidth="sm">
        <Typography variant="h5" fontWeight={600} textAlign="center" gutterBottom>
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
                bgcolor: 'white',
                borderRadius: 2,
                boxShadow: 1,
                p: 2,
                mx: 'auto',
                maxWidth: 320,
                fontFamily: '"Courier New", monospace',
                fontSize: 11,
                lineHeight: 1.35,
                '& .center': { textAlign: 'center' },
                '& .bold': { fontWeight: 'bold' },
                '& .large': { fontSize: 14 },
                '& .divider': { borderTop: '1px dashed #000', my: 0.5 },
                '& .row': { display: 'flex', justifyContent: 'space-between', gap: 1, fontSize: 10 },
              }}
              dangerouslySetInnerHTML={{
                __html: buildThermalReceiptBodyInnerHtml(receipt, { assigneeLabel: 'Staff' }),
              }}
            />
          </>
        )}
      </Container>
    </Box>
  );
}
