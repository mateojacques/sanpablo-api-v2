/**
 * Maps the customer's stock table (stockWeb.DBF) to the product import CSV.
 *
 * This file and src/scripts/import-products/STOCK_DBF.md are the single source
 * of truth for the mapping. Field names are matched exactly: a renamed field
 * must fail loudly instead of importing garbage.
 */
import { DbfFormatError } from './dbf-errors.js';
import type { DbfRecord, DbfValue } from './dbf-reader.js';

export const REQUIRED_STOCK_FIELDS = ['STCODIGO', 'STDESCRIP', 'STPRECUNI2'] as const;

export function assertStockFields(fieldNames: string[]): void {
  const present = new Set(fieldNames);
  const missing = REQUIRED_STOCK_FIELDS.filter((name) => !present.has(name));
  if (missing.length > 0) {
    throw new DbfFormatError(
      'DBF_MISSING_FIELDS',
      `Missing required DBF fields: ${missing.join(', ')}`,
      { missing }
    );
  }
}

function pickStr(rec: DbfRecord, fields: string[]): string {
  for (const field of fields) {
    const value = rec[field];
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text === '') continue;
    return text;
  }
  return '';
}

function pickNum(rec: DbfRecord, fields: string[]): number | null {
  for (const field of fields) {
    const value = rec[field];
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    const num = Number(value);
    if (Number.isNaN(num)) continue;
    return num;
  }
  return null;
}

function formatPrice(value: number | null): string {
  return value === null ? '' : value.toFixed(2);
}

// Keeps ASCII a-z0-9 only, like the Python version: accented letters become dashes
function slugify(value: string): string {
  const lower = value.trim().toLowerCase();
  let slug = '';
  let prevDash = false;
  for (const ch of lower) {
    if ((ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9')) {
      slug += ch;
      prevDash = false;
    } else if (!prevDash) {
      slug += '-';
      prevDash = true;
    }
  }
  return slug.replace(/^-+|-+$/g, '');
}

function parseBoolish(value: DbfValue | undefined): boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const text = value.trim().toLowerCase();
  if (['1', 'true', 't', 'y', 'yes', 'si', 's'].includes(text)) return true;
  if (['0', 'false', 'f', 'n', 'no'].includes(text)) return false;
  return null;
}

/** Returns one CSV row, in CSV_HEADERS order. */
export function mapStockRecord(rec: DbfRecord): string[] {
  const sku = pickStr(rec, ['STCODIGO']);
  const name = pickStr(rec, ['STDESCRIP']);
  const description = pickStr(rec, ['STDETALLE', 'STDESCRIP']);

  const regular = pickNum(rec, ['STPRECUNI2']);
  // TODO: PRECIO DE OFERTA (no source field identified yet)
  const salePrice = '';
  // TODO: PRECIO ESPECIAL (price list 1 is the best guess)
  const special = pickNum(rec, ['STPRECUNI1']);

  const specialPrice =
    special !== null && regular !== null && special > 0 && special < regular
      ? formatPrice(special)
      : '';

  const famName = pickStr(rec, ['STNOMFAM']);
  let famCode = pickStr(rec, ['STFAMILIA']);
  // STFAMILIA '000' means "no family"
  if (/^0*$/.test(famCode)) famCode = '';
  const categorySlug = slugify(famName) || slugify(famCode);

  // STBORRAR is a soft-delete mark: true means the product is not active
  const borrar = parseBoolish(rec.STBORRAR);
  const isActive = borrar === null ? true : !borrar;

  // The table has no images, video, weight or dimensions
  return [
    sku,
    name,
    description,
    formatPrice(regular),
    salePrice,
    specialPrice,
    categorySlug,
    '',
    '',
    '',
    '',
    '',
    '',
    isActive ? 'true' : 'false',
  ];
}
