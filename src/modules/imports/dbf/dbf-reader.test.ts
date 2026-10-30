import { describe, it, expect } from 'vitest';
import { readDbf } from './dbf-reader.js';
import { DbfFormatError } from './dbf-errors.js';
import { buildDbf } from './test-utils/build-dbf.js';

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(DbfFormatError);
    return (err as DbfFormatError).code;
  }
  return undefined;
}

describe('readDbf', () => {
  it('reads C, N, L, D and M fields', () => {
    const buf = buildDbf({
      fields: [
        { name: 'STCODIGO', type: 'C', length: 9 },
        { name: 'STPRECUNI2', type: 'N', length: 12, decimals: 3 },
        { name: 'STBORRAR', type: 'L', length: 1 },
        { name: 'STFECACTU', type: 'D', length: 8 },
        { name: 'STDETALLE', type: 'M', length: 4 },
      ],
      records: [{ values: ['0000694', '  1234.500', 'F', '20261014', '    '] }],
    });

    expect(readDbf(buf).records).toEqual([
      {
        STCODIGO: '0000694',
        STPRECUNI2: 1234.5,
        STBORRAR: false,
        STFECACTU: '2026-10-14',
        STDETALLE: null,
      },
    ]);
  });

  it('skips deleted records and counts them', () => {
    const buf = buildDbf({
      fields: [{ name: 'STCODIGO', type: 'C', length: 9 }],
      records: [{ values: ['1'] }, { values: ['2'], deleted: true }, { values: ['3'] }],
    });

    const table = readDbf(buf);

    expect(table.records.length).toBe(2);
    expect(table.records.map((r) => r.STCODIGO)).toEqual(['1', '3']);
    expect(table.deletedCount).toBe(1);
  });

  it('decodes windows-1252', () => {
    const buf = buildDbf({
      fields: [{ name: 'STDESCRIP', type: 'C', length: 10 }],
      records: [{ values: ['…ñ'] }],
    });

    expect(buf.includes(Buffer.from([0x85, 0xf1]))).toBe(true);
    expect(readDbf(buf).records[0].STDESCRIP).toBe('…ñ');
  });

  it('blank numeric is null', () => {
    const buf = buildDbf({
      fields: [{ name: 'STPRECUNI1', type: 'N', length: 12, decimals: 3 }],
      records: [{ values: [''] }],
    });

    expect(readDbf(buf).records[0].STPRECUNI1).toBeNull();
  });

  it('skips _NullFlags', () => {
    const buf = buildDbf({
      fields: [
        { name: 'STCODIGO', type: 'C', length: 4 },
        { name: '_NullFlags', type: '0', length: 2 },
        { name: 'STDESCRIP', type: 'C', length: 6 },
      ],
      records: [{ values: ['A1', 'xx', 'LAPIZ'] }],
    });

    const table = readDbf(buf);

    expect(table.fields.map((f) => f.name)).toEqual(['STCODIGO', 'STDESCRIP']);
    expect(table.records[0]).toEqual({ STCODIGO: 'A1', STDESCRIP: 'LAPIZ' });
  });

  it('unknown type decodes as trimmed string', () => {
    const buf = buildDbf({
      fields: [{ name: 'STRARO', type: 'V', length: 5 }],
      records: [{ values: ['abc  '] }],
    });

    expect(readDbf(buf).records[0].STRARO).toBe('abc');
  });

  it('rejects truncated buffer', () => {
    const buf = buildDbf({
      fields: [{ name: 'STCODIGO', type: 'C', length: 9 }],
      records: [{ values: ['1'] }, { values: ['2'] }],
    });

    expect(codeOf(() => readDbf(buf.subarray(0, buf.length - 10)))).toBe('INVALID_DBF');
  });

  it('rejects unsupported code page', () => {
    const buf = buildDbf({
      fields: [{ name: 'STCODIGO', type: 'C', length: 9 }],
      records: [{ values: ['1'] }],
      codePage: 0x65,
    });

    expect(codeOf(() => readDbf(buf))).toBe('UNSUPPORTED_CODE_PAGE');
  });
});
