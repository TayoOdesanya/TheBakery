import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

const isDev = process.env.NODE_ENV !== 'production';

// ── Email ─────────────────────────────────────────────────────────────────────

let gmailTransport = null;

function getGmailTransport() {
  if (gmailTransport) return gmailTransport;
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null;
  gmailTransport = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  return gmailTransport;
}

async function sendEmail({ to, subject, html, text }) {
  const from = process.env.EMAIL_FROM || process.env.GMAIL_USER || 'noreply@thebakery.com';

  // Try SendGrid first
  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    try {
      await sgMail.send({ to, from, subject, html, text });
      return;
    } catch (err) {
      console.warn('[email] SendGrid failed, falling back to Gmail:', err.message);
    }
  }

  // Gmail fallback
  const transport = getGmailTransport();
  if (transport) {
    await transport.sendMail({ from, to, subject, html, text });
    return;
  }

  console.warn('[email] No email provider configured — skipping send to', to);
}

// ── SMS ───────────────────────────────────────────────────────────────────────

let twilioClient = null;

function getTwilio() {
  if (twilioClient) return twilioClient;
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return null;
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  return twilioClient;
}

async function sendSms(to, body) {
  const client = getTwilio();
  if (!client) {
    if (!isDev) console.warn('[sms] Twilio not configured — skipping SMS to', to);
    return;
  }
  try {
    await client.messages.create({ from: process.env.TWILIO_FROM_NUMBER, to, body });
  } catch (err) {
    console.warn('[sms] Failed to send SMS to', to, ':', err.message);
  }
}

// ── Notification templates ────────────────────────────────────────────────────

export async function notifyOrderConfirmed(order) {
  const { customerName, orderNumber, customerEmail, customerPhone, fulfillmentType } = order;
  const label = fulfillmentType === 'delivery' ? 'delivered to your address' : 'ready for collection';
  const subject = `Order Confirmed — #${orderNumber}`;
  const html = `
    <p>Hi ${customerName},</p>
    <p>Your order <strong>#${orderNumber}</strong> has been confirmed and is being prepared.</p>
    <p>We'll let you know when it's ${label}.</p>
    <p>Thanks for ordering from The Bakery!</p>
  `;
  const text = `Hi ${customerName}, your order #${orderNumber} is confirmed and being prepared. We'll update you when it's ${label}.`;

  if (customerEmail) await sendEmail({ to: customerEmail, subject, html, text });
  if (customerPhone) await sendSms(customerPhone, text);
}

export async function notifyOrderDispatched(order) {
  const { customerName, orderNumber, customerEmail, customerPhone, trackingNumber, fulfillmentType } = order;
  const isDelivery = fulfillmentType === 'delivery';
  const subject = isDelivery ? `Your order #${orderNumber} has been posted!` : `Your order #${orderNumber} is ready for collection`;

  const trackingLine = isDelivery && trackingNumber
    ? `<p>Tracking number: <strong>${trackingNumber}</strong></p>`
    : '';
  const trackingText = isDelivery && trackingNumber ? ` Tracking: ${trackingNumber}.` : '';

  const html = isDelivery
    ? `<p>Hi ${customerName},</p><p>Great news — your order <strong>#${orderNumber}</strong> has been posted and is on its way!</p>${trackingLine}<p>Thanks for ordering from The Bakery!</p>`
    : `<p>Hi ${customerName},</p><p>Your order <strong>#${orderNumber}</strong> is ready and waiting for you to collect.</p><p>Thanks for ordering from The Bakery!</p>`;

  const text = isDelivery
    ? `Hi ${customerName}, your order #${orderNumber} has been posted!${trackingText}`
    : `Hi ${customerName}, your order #${orderNumber} is ready for collection.`;

  if (customerEmail) await sendEmail({ to: customerEmail, subject, html, text });
  if (customerPhone) await sendSms(customerPhone, text);
}

export async function notifyOrderUpdate(order, message) {
  const { customerName, orderNumber, customerEmail, customerPhone } = order;
  const subject = `Update on your order #${orderNumber}`;
  const html = `<p>Hi ${customerName},</p><p>${message}</p><p>The Bakery</p>`;
  const text = `Hi ${customerName}, update on order #${orderNumber}: ${message}`;

  if (customerEmail) await sendEmail({ to: customerEmail, subject, html, text });
  if (customerPhone) await sendSms(customerPhone, text);
}

export async function notifyBakeryOverdue(order, ownerEmail) {
  if (!ownerEmail) return;
  const { orderNumber, customerName, createdAt, shippingType } = order;
  const subject = `OVERDUE: Order #${orderNumber} needs dispatching`;
  const html = `
    <p><strong>Overdue order alert</strong></p>
    <p>Order <strong>#${orderNumber}</strong> for ${customerName} was placed on ${new Date(createdAt).toLocaleDateString('en-GB')}
    and has not been dispatched yet.</p>
    <p>Shipping type: ${shippingType || 'standard'}</p>
    <p>Please dispatch this order as soon as possible.</p>
  `;
  const text = `OVERDUE: Order #${orderNumber} for ${customerName} (placed ${new Date(createdAt).toLocaleDateString('en-GB')}) has not been dispatched. Please action immediately.`;
  await sendEmail({ to: ownerEmail, subject, html, text });
}
