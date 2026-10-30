import { describe, it, expect } from 'vitest';
import { CSV_HEADERS } from '../imports.schemas.js';
import { parseCsvLine } from '../csv-line.js';
import { DbfFormatError } from './dbf-errors.js';
import { dbfToCsv, toCsv } from './dbf-to-csv.js';
import { buildDbf } from './test-utils/build-dbf.js';

const stockFields = [
  { name: 'STCODIGO', type: 'C', length: 9 },
  { name: 'STDESCRIP', type: 'C', length: 40 },
  { name: 'STPRECUNI1', type: 'N', length: 12, decimals: 3 },
  { name: 'STPRECUNI2', type: 'N', length: 12, decimals: 3 },
  { name: 'STBORRAR', type: 'L', length: 1 },
];

const stockRecords = [
  { values: ['0000001', 'CUADERNO A4', '1200.000', '1500.000', 'F'] },
  { values: ['0000694', 'ROLLO "FILM", 30cm', '0.000', '900.000', 'F'] },
];

describe('toCsv', () => {
  it('toCsv round-trips through parseCsvLine', () => {
    const row = ['ROLLO "FILM", 30cm', '12'];

    expect(parseCsvLine(toCsv(['a', 'b'], [row]).split('\n')[1])).toEqual(row);
  });
});

describe('dbfToCsv', () => {
  it('api format', () => {
    const { csv, rowCount } = dbfToCsv(
      buildDbf({ fields: stockFields, records: stockRecords }),
      'api'
    );

    expect(rowCount).toBe(2);
    expect(csv.split('\n')[0]).toBe(CSV_HEADERS.join(','));
    expect(csv.charCodeAt(0)).not.toBe(0xfeff);
    expect(parseCsvLine(csv.split('\n')[2])[1]).toBe('ROLLO "FILM", 30cm');
  });

  it('api format rejects a table without STPRECUNI2', () => {
    const buf = buildDbf({
      fields: stockFields.filter((f) => f.name !== 'STPRECUNI2'),
      records: [{ values: ['0000001', 'CUADERNO A4', '1200.000', 'F'] }],
    });

    let error: unknown;
    try {
      dbfToCsv(buf, 'api');
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(DbfFormatError);
    expect((error as DbfFormatError).code).toBe('DBF_MISSING_FIELDS');
  });

  it('raw format keeps every column', () => {
    const { csv, rowCount } = dbfToCsv(
      buildDbf({ fields: stockFields, records: stockRecords }),
      'raw'
    );
    const lines = csv.split('\n');

    expect(rowCount).toBe(2);
    expect(lines[0]).toBe('STCODIGO,STDESCRIP,STPRECUNI1,STPRECUNI2,STBORRAR');
    expect(parseCsvLine(lines[1])).toEqual([
      '0000001',
      'CUADERNO A4',
      '1200',
      '1500',
      'false',
    ]);
  });
});
