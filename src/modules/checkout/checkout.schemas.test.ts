import { describe, expect, it } from 'vitest';
import { saveContactBodySchema } from './checkout.schemas.js';

const body = {
  fullName: 'Ana Pérez',
  email: 'ana@ejemplo.com',
  phone: '11 5512 3456',
  address: 'Calle Falsa 123, Buenos Aires',
};

describe('saveContactBodySchema', () => {
  it('stores the normalized WhatsApp number', () => {
    expect(saveContactBodySchema.parse(body).phone).toBe('+5491155123456');
  });

  it('rejects a number without area code on the phone field', () => {
    const result = saveContactBodySchema.safeParse({ ...body, phone: '12345678' });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0].path).toEqual(['phone']);
    expect(result.error.issues[0].message).toBe(
      'Ingrese un número de WhatsApp válido, con código de área.'
    );
  });
});
