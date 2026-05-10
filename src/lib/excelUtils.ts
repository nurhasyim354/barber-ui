/**
 * Utilitas Excel menggunakan library `xlsx` (SheetJS).
 * - exportWorkbook: buat file .xlsx dengan beberapa sheet dan trigger download
 * - parseExcelFile: baca file .xlsx / .xls dan kembalikan array baris per sheet
 */
import * as XLSX from 'xlsx';

export type SheetData = {
  name: string;
  rows: Record<string, string | number | boolean | null | undefined>[];
};

/** Download workbook Excel dengan satu atau lebih sheet. */
export function exportWorkbook(sheets: SheetData[], filename: string): void {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

/** Baca file Excel dan kembalikan array objek per baris untuk sheet pertama (atau sheet ke-`sheetIndex`). */
export function parseExcelFile(
  file: File,
  sheetIndex = 0,
): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const sheetName = wb.SheetNames[sheetIndex];
        if (!sheetName) {
          reject(new Error('Sheet tidak ditemukan di file Excel'));
          return;
        }
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsArrayBuffer(file);
  });
}
