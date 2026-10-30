import { TextDecoder } from 'node:util';

type BuildDbfField = { name: string; type: string; length: number; decimals?: number };
type BuildDbfRecord = { values: string[]; deleted?: boolean };

// Reverse of TextDecoder('windows-1252') for bytes 0x80-0xFF
const cp1252Bytes = new Map<string, number>();
const cp1252Decoder = new TextDecoder('windows-1252');
for (let byte = 0x80; byte <= 0xff; byte++) {
  cp1252Bytes.set(cp1252Decoder.decode(Uint8Array.of(byte)), byte);
}

function encodeCp1252(text: string): number[] {
  return Array.from(text, (ch) => {
    const code = ch.charCodeAt(0);
    if (code < 0x80) return code;
    const byte = cp1252Bytes.get(ch);
    if (byte === undefined) throw new Error(`Character not in windows-1252: ${ch}`);
    return byte;
  });
}

/**
 * Builds a minimal Visual FoxPro table in memory. Each value is the raw field
 * text, space-padded (or cut) to the field length.
 */
export function buildDbf(opts: {
  fields: BuildDbfField[];
  records: BuildDbfRecord[];
  codePage?: number;
}): Buffer {
  const { fields, records, codePage = 0x03 } = opts;
  const headerLength = 32 + fields.length * 32 + 1;
  const recordLength = 1 + fields.reduce((sum, f) => sum + f.length, 0);
  const buffer = Buffer.alloc(headerLength + records.length * recordLength + 1, 0x20);

  buffer.fill(0, 0, headerLength);
  buffer[0] = 0x30;
  buffer.writeUInt32LE(records.length, 4);
  buffer.writeUInt16LE(headerLength, 8);
  buffer.writeUInt16LE(recordLength, 10);
  buffer[29] = codePage;

  fields.forEach((field, i) => {
    const offset = 32 + i * 32;
    buffer.write(field.name.slice(0, 10), offset, 'ascii');
    buffer.write(field.type, offset + 11, 'ascii');
    buffer[offset + 16] = field.length;
    buffer[offset + 17] = field.decimals ?? 0;
  });
  buffer[headerLength - 1] = 0x0d;

  records.forEach((record, r) => {
    let offset = headerLength + r * recordLength;
    buffer[offset++] = record.deleted ? 0x2a : 0x20;
    fields.forEach((field, i) => {
      const bytes = encodeCp1252(record.values[i] ?? '').slice(0, field.length);
      Buffer.from(bytes).copy(buffer, offset);
      offset += field.length;
    });
  });
  buffer[buffer.length - 1] = 0x1a;

  return buffer;
}
