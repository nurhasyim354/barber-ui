'use client';

import {
  Box,
  Button,
  FormControlLabel,
  IconButton,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

export type StaffAvailabilityDaysHours = Partial<
  Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', { start: string; end: string }[]>
>;

export type StaffAvailabilityEditorDay = {
  enabled: boolean;
  windows: { start: string; end: string }[];
};

export type StaffAvailabilityEditorValue = Record<
  'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun',
  StaffAvailabilityEditorDay
>;

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
type DayKey = (typeof DAY_KEYS)[number];

const DAY_LABEL: Record<DayKey, string> = {
  mon: 'Senin',
  tue: 'Selasa',
  wed: 'Rabu',
  thu: 'Kamis',
  fri: 'Jumat',
  sat: 'Sabtu',
  sun: 'Minggu',
};

const HM = /^([01]?\d|2[0-3]):[0-5]\d$/;

function normalizeTime(s: string): string {
  const p = String(s ?? '').trim().replace('.', ':');
  const m = /^(\d{1,2}):(\d{2})$/.exec(p);
  if (!m) return p;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function expandScheduleForEditor(
  api: StaffAvailabilityDaysHours | null | undefined,
): StaffAvailabilityEditorValue | null {
  if (!api || Object.keys(api).length === 0) return null;
  const out = {} as StaffAvailabilityEditorValue;
  for (const k of DAY_KEYS) {
    const w = api[k];
    if (w && Array.isArray(w) && w.length > 0) {
      out[k] = { enabled: true, windows: w.map((x) => ({ start: x.start, end: x.end })) };
    } else {
      out[k] = { enabled: false, windows: [{ start: '09:00', end: '17:00' }] };
    }
  }
  return out;
}

function defaultEditorValue(): StaffAvailabilityEditorValue {
  const o = {} as StaffAvailabilityEditorValue;
  for (const k of DAY_KEYS) {
    if (k === 'sat' || k === 'sun') {
      o[k] = { enabled: false, windows: [{ start: '09:00', end: '15:00' }] };
    } else {
      o[k] = { enabled: true, windows: [{ start: '09:00', end: '17:00' }] };
    }
  }
  return o;
}

export function serializeScheduleForApi(v: StaffAvailabilityEditorValue): StaffAvailabilityDaysHours {
  const out: StaffAvailabilityDaysHours = {};
  for (const k of DAY_KEYS) {
    const row = v[k];
    if (row.enabled && row.windows.length > 0) {
      out[k] = row.windows.map((w) => ({
        start: normalizeTime(w.start),
        end: normalizeTime(w.end),
      }));
    }
  }
  return out;
}

function parseHm(s: string): number | null {
  const n = normalizeTime(s);
  if (!HM.test(n)) return null;
  const [h, m] = n.split(':').map((x) => parseInt(x, 10));
  return h * 60 + m;
}

export function validateScheduleSlots(v: StaffAvailabilityEditorValue): string | null {
  for (const k of DAY_KEYS) {
    const row = v[k];
    if (!row.enabled) continue;
    let i = 0;
    for (const w of row.windows) {
      i += 1;
      const a = parseHm(w.start);
      const b = parseHm(w.end);
      if (a == null || b == null) {
        return `${DAY_LABEL[k]} jendela ${i}: format jam pakai HH:mm (contoh 09:00).`;
      }
      if (b <= a) {
        return `${DAY_LABEL[k]} jendela ${i}: jam selesai harus setelah jam mulai.`;
      }
    }
  }
  return null;
}

export function scheduleHasAtLeastOneOpenSlot(v: StaffAvailabilityEditorValue): boolean {
  return DAY_KEYS.some((k) => v[k].enabled && v[k].windows.length > 0);
}

type Props = {
  value: StaffAvailabilityEditorValue | null;
  onChange: (next: StaffAvailabilityEditorValue | null) => void;
};

export function StaffAvailabilityEditor({ value, onChange }: Props) {
  const enabled = value != null;

  const patch = (next: StaffAvailabilityEditorValue) => {
    onChange(next);
  };

  const toggleDay = (k: DayKey, on: boolean) => {
    if (!value) return;
    patch({
      ...value,
      [k]: {
        ...value[k],
        enabled: on,
        windows:
          value[k].windows.length > 0 ? value[k].windows : [{ start: '09:00', end: '17:00' }],
      },
    });
  };

  const patchWindow = (k: DayKey, idx: number, field: 'start' | 'end', v: string) => {
    if (!value) return;
    const windows = value[k].windows.map((w, i) => (i === idx ? { ...w, [field]: v } : w));
    patch({ ...value, [k]: { ...value[k], windows } });
  };

  const addWindow = (k: DayKey) => {
    if (!value) return;
    patch({
      ...value,
      [k]: {
        ...value[k],
        windows: [...value[k].windows, { start: '13:00', end: '17:00' }],
      },
    });
  };

  const removeWindow = (k: DayKey, idx: number) => {
    if (!value) return;
    const windows = value[k].windows.filter((_, i) => i !== idx);
    patch({
      ...value,
      [k]: {
        ...value[k],
        windows: windows.length > 0 ? windows : [{ start: '09:00', end: '17:00' }],
      },
    });
  };

  return (
    <Box sx={{ mt: 1 }}>
      <FormControlLabel
        control={
          <Switch
            checked={enabled}
            onChange={(_, c) => (c ? onChange(defaultEditorValue()) : onChange(null))}
          />
        }
        label={
          <Typography variant="body2" fontWeight={600}>
            Jadwal mingguan (batas hari &amp; jam booking)
          </Typography>
        }
      />
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, ml: 4.5 }}>
        Nonaktifkan = staff bisa di-book kapan saja (tanpa filter hari). Saat aktif, hari tanpa jendela = libur.
      </Typography>

      {enabled && value && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, ml: 0.5 }}>
          {DAY_KEYS.map((k) => (
            <Box
              key={k}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: 1.5,
                bgcolor: value[k].enabled ? 'action.hover' : 'transparent',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" fontWeight={700}>
                  {DAY_LABEL[k]}
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={value[k].enabled}
                      onChange={(_, c) => toggleDay(k, c)}
                    />
                  }
                  label={<Typography variant="caption">Buka</Typography>}
                  sx={{ mr: 0 }}
                />
              </Box>
              {value[k].enabled && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {value[k].windows.map((w, idx) => (
                    <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      <TextField
                        size="small"
                        label="Mulai"
                        value={w.start}
                        onChange={(e) => patchWindow(k, idx, 'start', e.target.value)}
                        placeholder="09:00"
                        sx={{ width: 108 }}
                      />
                      <TextField
                        size="small"
                        label="Selesai"
                        value={w.end}
                        onChange={(e) => patchWindow(k, idx, 'end', e.target.value)}
                        placeholder="17:00"
                        sx={{ width: 108 }}
                      />
                      {value[k].windows.length > 1 && (
                        <IconButton
                          size="small"
                          aria-label="hapus jendela"
                          onClick={() => removeWindow(k, idx)}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<AddIcon />}
                    onClick={() => addWindow(k)}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Tambah jendela (mis. istirahat siang)
                  </Button>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
