import { CSV_HEADERS } from '../imports.schemas.js';
import { readDbf } from './dbf-reader.js';
import { assertStockFields, mapStockRecord } from './stock-mapping.js';
import type { DbfValue } from './dbf-reader.js';

/** 'api' = import CSV columns; 'raw' = every DBF field, for inspecting the table */
export type DbfCsvFormat = 'api' | 'raw';

function escapeCsvValue(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** RFC 4180 CSV, `\n` line endings, trailing newline, no BOM. */
export function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(','));
  return `${lines.join('\n')}\n`;
}

function rawValue(value: DbfValue): string {
  if (value === null) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  return value.trim();
}

export function dbfToCsv(
  buffer: Buffer,
  format: DbfCsvFormat
): { csv: string; rowCount: number } {
  const table = readDbf(buffer);
  const fieldNames = table.fields.map((f) => f.name);

  if (format === 'raw') {
    const rows = table.records.map((rec) => fieldNames.map((name) => rawValue(rec[name])));
    return { csv: toCsv(fieldNames, rows), rowCount: rows.length };
  }

  assertStockFields(fieldNames);
  const rows = table.records.map(mapStockRecord);
  return { csv: toCsv(CSV_HEADERS, rows), rowCount: rows.length };
}
