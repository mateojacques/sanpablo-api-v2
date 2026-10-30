import { describe, it, expect } from 'vitest';
import { CSV_HEADERS } from '../imports.schemas.js';
import { DbfFormatError } from './dbf-errors.js';
import { assertStockFields, mapStockRecord } from './stock-mapping.js';
import type { DbfRecord } from './dbf-reader.js';

const typical: DbfRecord = {
  STCODIGO: '0000001',
  STDESCRIP: 'CUADERNO A4',
  STDETALLE: null,
  STPRECUNI2: 1500,
  STPRECUNI1: 1200,
  STNOMFAM: 'HOJAS VARIAS',
  STFAMILIA: '110',
  STBORRAR: false,
};

function column(row: string[], name: string): string {
  return row[CSV_HEADERS.indexOf(name)];
}

describe('mapStockRecord', () => {
  it('maps a typical record', () => {
    expect(mapStockRecord(typical)).toEqual([
      '0000001',
      'CUADERNO A4',
      'CUADERNO A4',
      '1500.00',
      '',
      '1200.00',
      'hojas-varias',
      '',
      '',
      '',
      '',
      '',
      '',
      'true',
    ]);
  });

  it('special price omitted when not lower than regular', () => {
    const row = mapStockRecord({ ...typical, STPRECUNI1: 1500, STPRECUNI2: 1500 });

    expect(column(row, 'special_price')).toBe('');
  });

  it('special price omitted when zero', () => {
    const row = mapStockRecord({ ...typical, STPRECUNI1: 0 });

    expect(column(row, 'special_price')).toBe('');
  });

  it('family 000 means no category', () => {
    const row = mapStockRecord({ ...typical, STNOMFAM: '', STFAMILIA: '000' });

    expect(column(row, 'category_slug')).toBe('');
  });

  it('falls back to family code', () => {
    const row = mapStockRecord({ ...typical, STNOMFAM: '', STFAMILIA: '30' });

    expect(column(row, 'category_slug')).toBe('30');
  });

  it('slugify collapses accents and symbols like Python', () => {
    const row = mapStockRecord({ ...typical, STNOMFAM: 'SOBRES OFICIO INGLÉS' });

    expect(column(row, 'category_slug')).toBe('sobres-oficio-ingl-s');
  });

  it('STBORRAR true marks inactive', () => {
    const row = mapStockRecord({ ...typical, STBORRAR: true });

    expect(column(row, 'is_active')).toBe('false');
  });

  it('missing STBORRAR stays active', () => {
    const rec = { ...typical };
    delete rec.STBORRAR;

    expect(column(mapStockRecord(rec), 'is_active')).toBe('true');
  });
});

describe('assertStockFields', () => {
  it('assertStockFields lists every missing field', () => {
    let error: unknown;
    try {
      assertStockFields(['STCODIGO']);
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(DbfFormatError);
    expect((error as DbfFormatError).code).toBe('DBF_MISSING_FIELDS');
    expect((error as DbfFormatError).details).toEqual({
      missing: ['STDESCRIP', 'STPRECUNI2'],
    });
  });
});
