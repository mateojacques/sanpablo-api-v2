import { TextDecoder } from 'node:util';
import { DbfFormatError } from './dbf-errors.js';

export type DbfValue = string | number | boolean | null;
export type DbfRecord = Record<string, DbfValue>;
export type DbfField = { name: string; type: string; length: number; decimals: number };
export type DbfTable = { fields: DbfField[]; records: DbfRecord[]; deletedCount: number };

type FieldLayout = DbfField & { offset: number };

const HEADER_SIZE = 32;
const DESCRIPTOR_SIZE = 32;
const DESCRIPTOR_TERMINATOR = 0x0d;
const DELETED_FLAG = 0x2a;
// 0x03 = Windows ANSI (cp1252); 0x00 = not set, which FoxPro treats as the system code page
const SUPPORTED_CODE_PAGES = new Set([0x00, 0x03]);
// VFP's hidden _NullFlags field
const NULL_FLAGS_TYPE = '0';

/**
 * Reads a dBase / Visual FoxPro table (.dbf) held in memory.
 * Memo files are never read: memo-like fields come back as null.
 */
export function readDbf(buffer: Buffer): DbfTable {
  if (buffer.length < HEADER_SIZE) {
    throw new DbfFormatError('INVALID_DBF', 'File is too short to be a DBF table');
  }

  const recordCount = buffer.readUInt32LE(4);
  const headerLength = buffer.readUInt16LE(8);
  const recordLength = buffer.readUInt16LE(10);
  const codePage = buffer[29];

  const layout = readFieldLayout(buffer, headerLength, recordLength);

  if (headerLength + recordCount * recordLength > buffer.length) {
    throw new DbfFormatError(
      'INVALID_DBF',
      `DBF declares ${recordCount} records but the file is truncated`
    );
  }

  if (!SUPPORTED_CODE_PAGES.has(codePage)) {
    throw new DbfFormatError(
      'UNSUPPORTED_CODE_PAGE',
      `Unsupported DBF code page 0x${codePage.toString(16).padStart(2, '0')}`
    );
  }

  const decoder = new TextDecoder('windows-1252');
  const records: DbfRecord[] = [];
  let deletedCount = 0;

  for (let i = 0; i < recordCount; i++) {
    const start = headerLength + i * recordLength;
    if (buffer[start] === DELETED_FLAG) {
      deletedCount++;
      continue;
    }

    const record: DbfRecord = {};
    for (const field of layout) {
      record[field.name] = decodeValue(buffer, start + field.offset, field, decoder);
    }
    records.push(record);
  }

  const fields = layout.map(({ name, type, length, decimals }) => ({
    name,
    type,
    length,
    decimals,
  }));

  return { fields, records, deletedCount };
}

function readFieldLayout(
  buffer: Buffer,
  headerLength: number,
  recordLength: number
): FieldLayout[] {
  const layout: FieldLayout[] = [];
  const end = Math.min(headerLength, buffer.length);
  let offset = HEADER_SIZE;
  // Byte 0 of each record is the deletion flag
  let fieldOffset = 1;
  let terminated = false;

  while (offset < end) {
    if (buffer[offset] === DESCRIPTOR_TERMINATOR) {
      terminated = true;
      break;
    }
    if (offset + DESCRIPTOR_SIZE > end) break;

    const rawName = buffer.subarray(offset, offset + 11);
    const nul = rawName.indexOf(0);
    const name = rawName.subarray(0, nul === -1 ? rawName.length : nul).toString('latin1');
    const type = String.fromCharCode(buffer[offset + 11]);
    const length = buffer[offset + 16];
    const decimals = buffer[offset + 17];

    if (type !== NULL_FLAGS_TYPE) {
      layout.push({ name, type, length, decimals, offset: fieldOffset });
    }
    fieldOffset += length;
    offset += DESCRIPTOR_SIZE;
  }

  if (!terminated) {
    throw new DbfFormatError('INVALID_DBF', 'DBF field descriptors are not terminated');
  }
  if (fieldOffset > recordLength) {
    throw new DbfFormatError('INVALID_DBF', 'DBF fields are longer than the record length');
  }

  return layout;
}

function decodeValue(
  buffer: Buffer,
  offset: number,
  field: FieldLayout,
  decoder: TextDecoder
): DbfValue {
  const bytes = buffer.subarray(offset, offset + field.length);

  switch (field.type) {
    case 'C':
      return decoder.decode(bytes).trimEnd();
    case 'N':
    case 'F': {
      const text = decoder.decode(bytes).trim();
      if (!text) return null;
      const value = Number(text);
      return Number.isNaN(value) ? null : value;
    }
    case 'L': {
      const flag = String.fromCharCode(bytes[0] ?? 0x20);
      if ('TtYy'.includes(flag)) return true;
      if ('FfNn'.includes(flag)) return false;
      return null;
    }
    case 'D': {
      const text = decoder.decode(bytes).trim();
      if (!/^\d{8}$/.test(text)) return null;
      return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
    }
    case 'I':
      return bytes.length >= 4 ? bytes.readInt32LE(0) : null;
    case 'B':
      return bytes.length >= 8 ? bytes.readDoubleLE(0) : null;
    case 'Y':
      return bytes.length >= 8 ? Number(bytes.readBigInt64LE(0)) / 10000 : null;
    case 'M':
    case 'G':
    case 'W':
    case 'T':
      return null;
    default:
      return decoder.decode(bytes).trim();
  }
}
