import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/env.js', () => ({
  env: { SMTP_FROM_EMAIL: 'pedidos@ejemplo.com', OWNER_EMAIL: 'owner@ejemplo.com' },
}));

vi.mock('../../config/email.js', () => ({
  emailTransporter: { sendMail: vi.fn() },
}));

import { emailTransporter } from '../../config/email.js';
import { emailService } from './email.js';

type OrderArg = Parameters<typeof emailService.sendNewOrderNotification>[0];

const order = {
  id: 'o1',
  orderNumber: 'SP-20261108-AB12',
  contactFullName: 'Ana Pérez',
  contactEmail: 'ana@ejemplo.com',
  contactPhone: '+5491155123456',
  contactAddress: 'Calle Falsa 123, Buenos Aires',
  customerNotes: null,
  total: '20.00',
  createdAt: new Date('2026-11-08T12:00:00Z'),
  items: [
    {
      productSku: 'A1',
      productName: 'Cuaderno',
      quantity: 2,
      unitPrice: '10.00',
      totalPrice: '20.00',
    },
  ],
} as unknown as OrderArg;

const sendMail = vi.mocked(emailTransporter.sendMail);
const sent = () => sendMail.mock.calls[0][0];
const html = () => sent().html as string;
const text = () => sent().text as string;
const subject = () => sent().subject as string;

describe('emailService', () => {
  beforeEach(() => {
    sendMail.mockReset();
  });

  it('links the owner to the customer', async () => {
    await emailService.sendNewOrderNotification(order);
    const url = new URL(html().match(/https:\/\/wa\.me\/[^"]+/)![0]);
    expect(url.pathname).toBe('/5491155123456');
    expect(url.searchParams.get('text')).toBe(
      'Pedido SP-20261108-AB12 de San Pablo. Este mensaje es para confirmar precio final, disponibilidad, pago y entrega.'
    );
    expect(html()).toContain('Abrir WhatsApp con el cliente');
  });

  it('escapes customer values in the HTML', async () => {
    await emailService.sendNewOrderNotification({
      ...order,
      contactFullName: 'Pérez & Hijos <img src=x>',
      customerNotes: '<script>x</script>',
    });
    expect(html()).toContain('Pérez &amp; Hijos &lt;img src=x&gt;');
    expect(html()).not.toContain('<img src=x>');
    expect(html()).not.toContain('<script>');
  });

  it('leaves the plain text part unescaped', async () => {
    await emailService.sendNewOrderNotification({
      ...order,
      contactFullName: 'Pérez & Hijos',
    });
    expect(text()).toContain('Pérez & Hijos');
  });

  it('tells the customer the order is received, not confirmed', async () => {
    await emailService.sendOrderConfirmationToCustomer(order);
    expect(subject()).toBe('Pedido SP-20261108-AB12 recibido');
    expect(html()).toContain('Total estimado');
    expect(html()).toContain('Dirección de entrega');
    expect(html()).toContain(
      'El precio final, la disponibilidad, el pago y la entrega se confirman por WhatsApp.'
    );
    for (const banned of ['Gracias', 'Hola', '¡', 'Envío', 'Confirmación']) {
      expect(html()).not.toContain(banned);
      expect(text()).not.toContain(banned);
    }
  });
});
