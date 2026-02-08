import { emailTransporter } from '../../config/email';
import { env } from '../../config/env';
import type { Order, OrderItem } from '../../db/schema/orders';

interface OrderWithItems extends Order {
  items: OrderItem[];
}

/**
 * Generate WhatsApp link with pre-filled message
 */
function generateWhatsAppLink(order: OrderWithItems): string {
  const phone = env.OWNER_WHATSAPP.replace(/\D/g, ''); // Remove non-digits
  const message = encodeURIComponent(
    `Hola! Soy del equipo de San Pablo. Te contacto por tu pedido #${order.orderNumber}.`
  );
  return `https://wa.me/${phone}?text=${message}`;
}

/**
 * Format currency
 */
function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(num);
}

/**
 * Generate order items HTML table
 */
function generateItemsTable(items: OrderItem[]): string {
  const rows = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.productSku}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.productName}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.unitPrice)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.totalPrice)}</td>
    </tr>
  `
    )
    .join('');

  return `
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <thead>
        <tr style="background-color: #f5f5f5;">
          <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">SKU</th>
          <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Producto</th>
          <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Cant.</th>
          <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Precio Unit.</th>
          <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4" style="padding: 10px; text-align: right; font-weight: bold;">Total:</td>
          <td style="padding: 10px; text-align: right; font-weight: bold; font-size: 1.1em;">${formatCurrency(items.reduce((sum, i) => sum + parseFloat(i.totalPrice), 0))}</td>
        </tr>
      </tfoot>
    </table>
  `;
}

export const emailService = {
  /**
   * Send new order notification to store owner
   */
  async sendNewOrderNotification(order: OrderWithItems): Promise<void> {
    const whatsappLink = generateWhatsAppLink(order);

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #4a90d9; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">Nuevo Pedido #${order.orderNumber}</h1>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none;">
          <h2 style="color: #4a90d9; margin-top: 0;">Datos del Cliente</h2>
          <table style="width: 100%;">
            <tr>
              <td style="padding: 5px 0;"><strong>Nombre:</strong></td>
              <td>${order.contactFullName}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Email:</strong></td>
              <td><a href="mailto:${order.contactEmail}">${order.contactEmail}</a></td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Teléfono:</strong></td>
              <td>${order.contactPhone}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Dirección:</strong></td>
              <td>${order.contactAddress}</td>
            </tr>
          </table>
          
          ${
            order.customerNotes
              ? `
          <div style="margin-top: 15px; padding: 10px; background-color: #fff3cd; border-radius: 4px;">
            <strong>Nota del cliente:</strong><br>
            ${order.customerNotes}
          </div>
          `
              : ''
          }
          
          <h2 style="color: #4a90d9;">Productos</h2>
          ${generateItemsTable(order.items)}
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${whatsappLink}" 
               style="display: inline-block; background-color: #25D366; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
              📱 Contactar por WhatsApp
            </a>
          </div>
          
          <p style="text-align: center; color: #666; margin-top: 20px; font-size: 12px;">
            Pedido creado el ${new Date(order.createdAt).toLocaleString('es-AR')}
          </p>
        </div>
        
        <div style="text-align: center; padding: 15px; color: #666; font-size: 12px;">
          Este es un email automático del sistema de pedidos.
        </div>
      </body>
      </html>
    `;

    const textBody = `
Nuevo Pedido #${order.orderNumber}

DATOS DEL CLIENTE
-----------------
Nombre: ${order.contactFullName}
Email: ${order.contactEmail}
Teléfono: ${order.contactPhone}
Dirección: ${order.contactAddress}

${order.customerNotes ? `Nota del cliente: ${order.customerNotes}\n` : ''}

PRODUCTOS
---------
${order.items.map((i) => `${i.productSku} - ${i.productName} x${i.quantity} = ${formatCurrency(i.totalPrice)}`).join('\n')}

TOTAL: ${formatCurrency(order.total)}

Contactar por WhatsApp: ${whatsappLink}
    `;

    await emailTransporter.sendMail({
      from: env.SMTP_FROM_EMAIL,
      to: env.OWNER_EMAIL,
      subject: `Nuevo Pedido #${order.orderNumber} - ${order.contactFullName}`,
      html: htmlBody,
      text: textBody,
    });
  },

  /**
   * Send order confirmation to customer
   */
  async sendOrderConfirmationToCustomer(order: OrderWithItems): Promise<void> {
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #4a90d9; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">¡Gracias por tu pedido!</h1>
          <p style="margin: 10px 0 0 0;">Pedido #${order.orderNumber}</p>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none;">
          <p>Hola <strong>${order.contactFullName}</strong>,</p>
          
          <p>Hemos recibido tu pedido correctamente. A continuación te enviamos el detalle:</p>
          
          <h2 style="color: #4a90d9;">Resumen del Pedido</h2>
          ${generateItemsTable(order.items)}
          
          <h2 style="color: #4a90d9;">Datos de Envío</h2>
          <p><strong>Dirección:</strong> ${order.contactAddress}</p>
          <p><strong>Teléfono:</strong> ${order.contactPhone}</p>
          
          <div style="background-color: #e8f4fd; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <p style="margin: 0;"><strong>¿Qué sigue?</strong></p>
            <p style="margin: 10px 0 0 0;">Nos pondremos en contacto contigo pronto para coordinar el pago y envío de tu pedido.</p>
          </div>
          
          <p style="margin-top: 20px;">Si tienes alguna pregunta, no dudes en contactarnos.</p>
          
          <p>¡Gracias por confiar en nosotros!</p>
        </div>
        
        <div style="text-align: center; padding: 15px; color: #666; font-size: 12px;">
          Este es un email automático. Por favor, no respondas a este mensaje.
        </div>
      </body>
      </html>
    `;

    const textBody = `
¡Gracias por tu pedido!
Pedido #${order.orderNumber}

Hola ${order.contactFullName},

Hemos recibido tu pedido correctamente.

RESUMEN DEL PEDIDO
------------------
${order.items.map((i) => `${i.productName} x${i.quantity} = ${formatCurrency(i.totalPrice)}`).join('\n')}

TOTAL: ${formatCurrency(order.total)}

DATOS DE ENVÍO
--------------
Dirección: ${order.contactAddress}
Teléfono: ${order.contactPhone}

Nos pondremos en contacto contigo pronto para coordinar el pago y envío.

¡Gracias por confiar en nosotros!
    `;

    await emailTransporter.sendMail({
      from: env.SMTP_FROM_EMAIL,
      to: order.contactEmail,
      subject: `Confirmación de Pedido #${order.orderNumber}`,
      html: htmlBody,
      text: textBody,
    });
  },
};
