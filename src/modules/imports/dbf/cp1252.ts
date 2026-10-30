/**
 * windows-1252 decoding without TextDecoder: Node 20's TextDecoder('windows-1252')
 * decodes 0x80-0x9F as latin1 C1 controls (0x85 becomes U+0085 instead of '…').
 */

// Bytes 0x80-0x9F (WHATWG table). Undefined bytes keep their code point.
const HIGH_RANGE = '€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008DŽ\u008F' + '\u0090‘’“”•–—˜™š›œ\u009DžŸ';

/** Bytes 0x00-0x7F and 0xA0-0xFF are the same as latin1. */
export function decodeCp1252(bytes: Buffer): string {
  return bytes
    .toString('latin1')
    .replace(/[\u0080-\u009f]/g, (ch) => HIGH_RANGE[ch.charCodeAt(0) - 0x80]);
}

/** Inverse of decodeCp1252 for the 0x80-0x9F range, keyed by character. */
export const CP1252_HIGH_BYTES: ReadonlyMap<string, number> = new Map(
  Array.from(HIGH_RANGE, (ch, i) => [ch, 0x80 + i])
);
