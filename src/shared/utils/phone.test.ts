import { describe, expect, it } from 'vitest';
import { toWhatsAppPhone } from './phone.js';

describe('toWhatsAppPhone', () => {
  it.each([
    ['011 15 5512-3456', '+5491155123456'],
    ['11 5512 3456', '+5491155123456'],
    ['5491155123456', '+5491155123456'],
    ['0294 15 4123456', '+5492944123456'],
    ['+34 612 345 678', '+34612345678'],
  ])('normalizes %s', (raw, expected) => {
    expect(toWhatsAppPhone(raw)).toBe(expected);
  });

  it.each(['15 5512 3456', '12345678', 'abc', ''])('rejects %s', (raw) => {
    expect(toWhatsAppPhone(raw)).toBeNull();
  });

  it('leaves an already normalized number unchanged', () => {
    const once = toWhatsAppPhone('011 15 5512-3456')!;
    expect(toWhatsAppPhone(once)).toBe(once);
  });
});
