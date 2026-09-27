import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@sxl-logistics.com';

let resend = null;
if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
}

export async function sendEmail({ to, subject, html, replyTo }) {
  if (!resend) {
    console.warn('[Email] Resend not configured - skipping');
    return { success: false, error: 'Resend not configured.' };
  }
  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      replyTo: replyTo || undefined,
    });
    if (result.error) {
      console.error('[Email] Error:', result.error);
      return { success: false, error: result.error.message };
    }
    return { success: true, id: result.data?.id };
  } catch (err) {
    console.error('[Email] Exception:', err.message);
    return { success: false, error: err.message };
  }
}

export async function sendBookingConfirmation(shipment) {
  const subject = 'Booking Confirmed - ' + shipment.tracking_number + ' | sXL';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background: #FF6B00; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">sXL - Super Express Logistics</h1>
      </div>
      <div style="padding: 30px 20px;">
        <h2 style="color: #003366; margin-top: 0;">Booking Confirmed</h2>
        <p>Dear ${shipment.sender_name || 'Customer'},</p>
        <p>Thank you for booking with sXL. Your booking has been received and is now being processed.</p>
        <div style="background: #F8F9FA; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <div style="font-size: 12px; text-transform: uppercase; color: #666; letter-spacing: 1px;">Tracking Number</div>
          <div style="font-family: monospace; font-size: 22px; font-weight: 800; color: #FF6B00; margin-top: 5px;">${shipment.tracking_number}</div>
        </div>
        <h3 style="color: #003366; margin-top: 25px;">Booking Details</h3>
        <table style="width: 100%; font-size: 14px; line-height: 1.8;">
          <tr><td style="color: #666;">Service:</td><td><b>${shipment.service_type || ''} (${shipment.ship_mode || ''})</b></td></tr>
          <tr><td style="color: #666;">Route:</td><td><b>${shipment.origin || ''} to ${shipment.destination || ''}</b></td></tr>
          <tr><td style="color: #666;">Recipient:</td><td><b>${shipment.recipient_name || ''}</b></td></tr>
          <tr><td style="color: #666;">Packages:</td><td><b>${shipment.packages || ''}</b></td></tr>
          <tr><td style="color: #666;">Weight:</td><td><b>${shipment.total_weight || ''} kg</b></td></tr>
        </table>
        <div style="background: #FFF5EB; padding: 15px; border-radius: 8px; border-left: 4px solid #FF6B00; margin: 25px 0; font-size: 14px;">
          Our team will review your booking and provide the shipping cost shortly.
        </div>
        <p style="text-align: center; margin: 30px 0;">
          <a href="https://sxlsuperexpress.vercel.app/track?tn=${shipment.tracking_number}" style="background: #FF6B00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block;">Track Shipment</a>
        </p>
      </div>
      <div style="background: #002347; color: #aaa; padding: 20px; text-align: center; font-size: 12px;">
        sXL - Super Express Logistics Center
      </div>
    </div>
  `;
  return sendEmail({ to: shipment.sender_email, subject, html, replyTo: ADMIN_EMAIL });
}

export async function sendAdminNewBookingAlert(shipment) {
  const subject = 'New Booking - ' + shipment.tracking_number;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background: #003366; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 20px;">New Booking Received</h1>
      </div>
      <div style="padding: 25px 20px;">
        <div style="background: #FFF5EB; padding: 15px; border-radius: 8px; border-left: 4px solid #FF6B00; margin-bottom: 20px;">
          <b>Tracking:</b> ${shipment.tracking_number}
        </div>
        <table style="width: 100%; font-size: 14px; line-height: 1.8;">
          <tr><td style="color: #666;">Service:</td><td><b>${shipment.service_type || ''}</b></td></tr>
          <tr><td style="color: #666;">Route:</td><td><b>${shipment.origin || ''} to ${shipment.destination || ''}</b></td></tr>
          <tr><td style="color: #666;">Shipper:</td><td><b>${shipment.sender_name || ''}</b></td></tr>
          <tr><td style="color: #666;">Shipper Email:</td><td><b>${shipment.sender_email || ''}</b></td></tr>
          <tr><td style="color: #666;">Shipper Phone:</td><td><b>${shipment.sender_phone || ''}</b></td></tr>
          <tr><td style="color: #666;">Consignee:</td><td><b>${shipment.recipient_name || ''}</b></td></tr>
          <tr><td style="color: #666;">Weight:</td><td><b>${shipment.total_weight || ''} kg</b></td></tr>
        </table>
        <p style="text-align: center; margin: 30px 0;">
          <a href="https://sxlsuperexpress.vercel.app/admin" style="background: #003366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block;">Open Admin Panel</a>
        </p>
      </div>
    </div>
  `;
  return sendEmail({ to: ADMIN_EMAIL, subject, html });
}

export async function sendStatusUpdate(shipment, newStatus, location, notes) {
  const subject = shipment.tracking_number + ' - ' + newStatus + ' | sXL';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background: #FF6B00; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">Shipment Update</h1>
      </div>
      <div style="padding: 30px 20px;">
        <p>Dear ${shipment.sender_name || 'Customer'},</p>
        <p>Your shipment has a new status update:</p>
        <div style="background: #F8F9FA; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <div style="font-size: 12px; text-transform: uppercase; color: #666; letter-spacing: 1px;">Tracking Number</div>
          <div style="font-family: monospace; font-size: 18px; font-weight: 800; color: #003366; margin-top: 5px;">${shipment.tracking_number}</div>
          <div style="margin-top: 15px; font-size: 14px; line-height: 1.8;">
            <div><b>Status:</b> ${newStatus}</div>
            ${location ? '<div><b>Location:</b> ' + location + '</div>' : ''}
            ${notes ? '<div><b>Notes:</b> ' + notes + '</div>' : ''}
          </div>
        </div>
        <p style="text-align: center; margin: 30px 0;">
          <a href="https://sxlsuperexpress.vercel.app/track?tn=${shipment.tracking_number}" style="background: #FF6B00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block;">Track Shipment</a>
        </p>
      </div>
      <div style="background: #002347; color: #aaa; padding: 20px; text-align: center; font-size: 12px;">
        sXL - Super Express Logistics Center
      </div>
    </div>
  `;
  return sendEmail({ to: shipment.sender_email, subject, html, replyTo: ADMIN_EMAIL });
}
