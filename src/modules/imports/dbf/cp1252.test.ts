import { describe, it, expect } from 'vitest';
import { decodeCp1252 } from './cp1252.js';

describe('decodeCp1252', () => {
  it('maps the 0x80-0x9F range to windows-1252 characters, not C1 controls', () => {
    expect(decodeCp1252(Buffer.from([0x80, 0x85, 0x91, 0x92, 0x96, 0x9f]))).toBe(
      '€…‘’–Ÿ'
    );
  });

  it('keeps bytes windows-1252 leaves undefined as their code points', () => {
    expect(decodeCp1252(Buffer.from([0x81, 0x8d, 0x8f, 0x90, 0x9d]))).toBe(
      '\u0081\u008d\u008f\u0090\u009d'
    );
  });

  it('decodes ASCII and 0xA0-0xFF like latin1', () => {
    expect(decodeCp1252(Buffer.from([0x41, 0x20, 0xd1, 0xf1, 0xe9, 0xb0]))).toBe(
      'A Ññé°'
    );
  });
});
