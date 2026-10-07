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

/* ============================================================
 *  VERIFICATION CODE
 * ============================================================ */
export async function sendVerificationCode({ to, code, contactPerson, companyName }) {
  const subject = 'Your sXL Verification Code: ' + code;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background: #FF6B00; padding: 24px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">sXL - Super Express Logistics</h1>
      </div>
      <div style="padding: 32px 24px;">
        <h2 style="color: #003366; margin-top: 0;">Verify Your Email Address</h2>
        <p>Hi ${contactPerson || 'there'},</p>
        <p>Welcome to sXL! To complete your registration for <b>${companyName || 'your account'}</b>, please use the verification code below:</p>

        <div style="background: #FFF5EB; padding: 24px; border-radius: 12px; margin: 28px 0; text-align: center; border: 2px dashed #FF6B00;">
          <div style="font-size: 12px; text-transform: uppercase; color: #8B4500; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 8px;">Verification Code</div>
          <div style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: 800; color: #FF6B00; letter-spacing: 8px; padding-left: 8px;">${code}</div>
        </div>

        <p style="color: #666; font-size: 14px;">This code expires in <b>10 minutes</b>.</p>

        <div style="background: #F8F9FA; padding: 15px; border-radius: 8px; border-left: 4px solid #003366; margin: 20px 0; font-size: 13px; color: #555;">
          If you didn't request this, you can safely ignore this email.
        </div>

        <p style="color: #666; font-size: 13px; margin-top: 30px;">
          Need help? Reply to this email or contact us at support@sxl-logistics.com
        </p>
      </div>
      <div style="background: #002347; color: #aaa; padding: 20px; text-align: center; font-size: 12px;">
        (c) sXL - Super Express Logistics Center
      </div>
    </div>
  `;
  return sendEmail({ to, subject, html, replyTo: ADMIN_EMAIL });
}

/* ============================================================
 *  BOOKING CONFIRMATION
 * ============================================================ */
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
          <a href="https://sxl-logistics.com/track?tn=${shipment.tracking_number}" style="background: #FF6B00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block;">Track Shipment</a>
        </p>
      </div>
      <div style="background: #002347; color: #aaa; padding: 20px; text-align: center; font-size: 12px;">
        (c) sXL - Super Express Logistics Center
      </div>
    </div>
  `;
  return sendEmail({ to: shipment.sender_email, subject, html, replyTo: ADMIN_EMAIL });
}

/* ============================================================
 *  ADMIN NEW BOOKING ALERT  (G.25 + G.42 — timeline block added)
 * ============================================================ */
export async function sendAdminNewBookingAlert(shipment) {
  const subject = 'New Booking - ' + shipment.tracking_number;

  const pickupYes = shipment.pickup_service !== false;
  const customsYes = String(shipment.custom_service || '').toLowerCase() === 'sxl';
  const deliveryYes = String(shipment.delivery_service || '').toLowerCase() === 'sxl';

  const fmtDate = (d) => {
    if (!d) return '-';
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return String(d);
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return String(dt.getDate()).padStart(2,'0') + ' ' + months[dt.getMonth()] + ' ' + dt.getFullYear();
    } catch (e) { return String(d); }
  };
  const fmtTime = (t) => {
    if (!t) return '-';
    return String(t).slice(0, 5);
  };

  const serviceLine = (label, yes) => {
    const icon = yes ? '✅' : '⬜';
    const color = yes ? '#155724' : '#6C757D';
    const note = yes ? '<b>YES — sXL must handle</b>' : 'No — customer / consignee handles';
    return `
      <div style="display: flex; align-items: center; padding: 6px 0; font-size: 14px; color: ${color};">
        <span style="font-size: 16px; margin-right: 8px;">${icon}</span>
        <span style="font-weight: 700; min-width: 90px;">${label}:</span>
        <span style="margin-left: 8px;">${note}</span>
      </div>
    `;
  };

  const servicesHtml = `
    <div style="background: #FFF5EB; border: 2px solid #FF6B00; border-radius: 10px; padding: 18px 20px; margin: 20px 0;">
      <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; color: #8B4500; font-weight: 800; margin-bottom: 12px;">
        📌 ACTION REQUIRED — Services customer requested
      </div>
      ${serviceLine('Pickup', pickupYes)}
      ${serviceLine('Customs', customsYes)}
      ${serviceLine('Delivery', deliveryYes)}
      <div style="font-size: 12px; color: #8B4500; margin-top: 12px; padding-top: 10px; border-top: 1px dashed #FF6B00; font-style: italic;">
        Remember to add charges in <b>Financial &amp; Billing → Update Shipment Cost</b> for each YES service.
      </div>
    </div>
  `;

  const parcelType = String(shipment.parcel_type || '').trim();
  const isSpecialParcel = parcelType === 'Special Parcel';
  const deliveryTimeline = isSpecialParcel && shipment.delivery_timeline
    ? String(shipment.delivery_timeline).trim()
    : null;

  const timelineHtml = deliveryTimeline ? `
    <div style="background: #FFE0B2; border: 2px solid #FF6B00; border-left: 6px solid #FF6B00; border-radius: 10px; padding: 16px 20px; margin: 20px 0;">
      <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #8B4500; font-weight: 800; margin-bottom: 8px;">
        ⚡ SPECIAL PARCEL — DELIVERY TIMELINE
      </div>
      <div style="font-size: 16px; font-weight: 800; color: #721C24;">
        ${deliveryTimeline}
      </div>
    </div>
  ` : '';

  const declaredValue = shipment.total_value
    ? (shipment.total_value + ' ' + (shipment.value_currency || 'USD'))
    : '-';

  const readyDateTime = (shipment.parcel_ready_date || shipment.parcel_ready_time)
    ? (fmtDate(shipment.parcel_ready_date) + ' at ' + fmtTime(shipment.parcel_ready_time))
    : '-';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #333;">
      <div style="background: #003366; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 20px;">New Booking Received</h1>
      </div>
      <div style="padding: 25px 20px;">
        <div style="background: #FFF5EB; padding: 15px; border-radius: 8px; border-left: 4px solid #FF6B00; margin-bottom: 20px;">
          <b>Tracking:</b> <span style="font-family: monospace; font-size: 15px;">${shipment.tracking_number}</span>
        </div>

        ${timelineHtml}
        ${servicesHtml}

        <table style="width: 100%; font-size: 14px; line-height: 1.8;">
          <tr><td style="color: #666;">Service:</td><td><b>${shipment.service_type || ''}</b></td></tr>
          <tr><td style="color: #666;">Route:</td><td><b>${shipment.origin || ''} to ${shipment.destination || ''}</b></td></tr>
          <tr><td style="color: #666;">Shipper:</td><td><b>${shipment.sender_name || ''}</b></td></tr>
          <tr><td style="color: #666;">Shipper Email:</td><td><b>${shipment.sender_email || ''}</b></td></tr>
          <tr><td style="color: #666;">Shipper Phone:</td><td><b>${shipment.sender_phone || ''}</b></td></tr>
          <tr><td style="color: #666;">Consignee:</td><td><b>${shipment.recipient_name || ''}</b></td></tr>
          <tr><td style="color: #666;">Weight:</td><td><b>${shipment.total_weight || ''} kg</b></td></tr>
          <tr><td style="color: #666;">Declared Value:</td><td><b>${declaredValue}</b></td></tr>
          <tr><td style="color: #666;">Pickup:</td><td><b>${pickupYes ? 'YES - Pickup by sXL' : 'NO - Self-delivery to warehouse'}</b></td></tr>
          <tr><td style="color: #666;">Customs:</td><td><b>${customsYes ? 'YES - Handled by sXL' : 'NO - Handled by Consignee'}</b></td></tr>
          <tr><td style="color: #666;">Delivery:</td><td><b>${deliveryYes ? 'YES - Handled by sXL' : 'NO - Handled by Consignee'}</b></td></tr>
          <tr><td style="color: #666;">Parcel Ready:</td><td><b>${readyDateTime}</b></td></tr>
        </table>

        <p style="text-align: center; margin: 30px 0;">
          <a href="https://sxl-logistics.com/admin" style="background: #003366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block;">Open Admin Panel</a>
        </p>
      </div>
      <div style="background: #002347; color: #aaa; padding: 20px; text-align: center; font-size: 12px;">
        (c) sXL - Super Express Logistics Center
      </div>
    </div>
  `;
  return sendEmail({ to: ADMIN_EMAIL, subject, html });
}

/* ============================================================
 *  G.42 — ADMIN ALERT: CUSTOMER CANCELLATION REQUEST
 * ============================================================ */
export async function sendAdminCancelRequestAlert(shipment, reason) {
  const subject = '🚨 Cancellation Request - ' + shipment.tracking_number;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #333;">
      <div style="background: #DC3545; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 20px;">⚠️ Cancellation Requested</h1>
      </div>
      <div style="padding: 25px 20px;">
        <div style="background: #F8D7DA; padding: 15px; border-radius: 8px; border-left: 4px solid #DC3545; margin-bottom: 20px;">
          <b>Tracking:</b> <span style="font-family: monospace; font-size: 15px;">${shipment.tracking_number}</span>
        </div>

        <p style="font-size: 14px;">A customer has requested to cancel the following shipment:</p>

        <table style="width: 100%; font-size: 14px; line-height: 1.8; margin: 15px 0;">
          <tr><td style="color: #666;">Customer:</td><td><b>${shipment.sender_name || '-'}</b></td></tr>
          <tr><td style="color: #666;">Email:</td><td><b>${shipment.sender_email || '-'}</b></td></tr>
          <tr><td style="color: #666;">Route:</td><td><b>${shipment.origin || '-'} → ${shipment.destination || '-'}</b></td></tr>
        </table>

        <div style="background: #FFF5EB; padding: 15px; border-radius: 8px; border-left: 4px solid #FF6B00; margin: 20px 0;">
          <div style="font-size: 12px; text-transform: uppercase; color: #8B4500; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 6px;">Reason from customer</div>
          <div style="font-size: 14px; font-style: italic; color: #343A40;">"${reason || 'No reason provided'}"</div>
        </div>

        <div style="background: #FFF3CD; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #FFC107; margin: 20px 0; font-size: 13px; color: #856404;">
          👉 Review this request in <b>Admin Panel → Cancellation Requests</b>.
        </div>

        <p style="text-align: center; margin: 30px 0;">
          <a href="https://sxl-logistics.com/admin" style="background: #DC3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block;">Review in Admin Panel</a>
        </p>
      </div>
      <div style="background: #002347; color: #aaa; padding: 20px; text-align: center; font-size: 12px;">
        (c) sXL - Super Express Logistics Center
      </div>
    </div>
  `;
  return sendEmail({ to: ADMIN_EMAIL, subject, html });
}

/* ============================================================
 *  G.42 — ADMIN ALERT: CREDIT ACCOUNT REQUEST
 * ============================================================ */
export async function sendAdminCreditRequestAlert(user, creditData) {
  const subject = '💳 New Credit Account Request - ' + (user.company_name || user.name || 'Unknown');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #333;">
      <div style="background: #003366; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 20px;">💳 New Credit Account Request</h1>
      </div>
      <div style="padding: 25px 20px;">
        <div style="background: #F8F9FA; padding: 15px; border-radius: 8px; border-left: 4px solid #003366; margin-bottom: 20px;">
          <b>Company:</b> ${user.company_name || '-'}
        </div>

        <p style="font-size: 14px;">A customer has submitted a credit account application.</p>

        <h3 style="color: #003366; font-size: 15px; margin-top: 24px; margin-bottom: 8px;">🏢 Company Information</h3>
        <table style="width: 100%; font-size: 14px; line-height: 1.9;">
          <tr><td style="color: #666;">Company Name:</td><td><b>${user.company_name || '-'}</b></td></tr>
          <tr><td style="color: #666;">Contact Person:</td><td><b>${user.contact_person || user.name || '-'}</b></td></tr>
          <tr><td style="color: #666;">Email:</td><td><b>${user.email || '-'}</b></td></tr>
          <tr><td style="color: #666;">Phone:</td><td><b>${user.phone || '-'}</b></td></tr>
          <tr><td style="color: #666;">BIN:</td><td><b>${user.company_bin || '-'}</b></td></tr>
          <tr><td style="color: #666;">Address:</td><td><b>${user.company_address || '-'}</b></td></tr>
          <tr><td style="color: #666;">City:</td><td><b>${user.company_city || '-'}</b></td></tr>
          <tr><td style="color: #666;">State:</td><td><b>${user.company_state || '-'}</b></td></tr>
          <tr><td style="color: #666;">Country:</td><td><b>${user.company_country || '-'}</b></td></tr>
        </table>

        <h3 style="color: #003366; font-size: 15px; margin-top: 24px; margin-bottom: 8px;">🏦 Bank Information</h3>
        <table style="width: 100%; font-size: 14px; line-height: 1.9;">
          <tr><td style="color: #666;">Bank Name:</td><td><b>${user.bank_name || '-'}</b></td></tr>
          <tr><td style="color: #666;">Account Holder:</td><td><b>${user.bank_account_name || '-'}</b></td></tr>
          <tr><td style="color: #666;">Account Number:</td><td><b>${user.bank_account_number || '-'}</b></td></tr>
          <tr><td style="color: #666;">SWIFT / IBAN:</td><td><b>${user.bank_swift || '-'}</b></td></tr>
          <tr><td style="color: #666;">Branch:</td><td><b>${user.bank_branch || '-'}</b></td></tr>
        </table>

        <div style="background: #FFF3CD; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #FFC107; margin: 24px 0; font-size: 13px; color: #856404;">
          👉 Review and approve/reject in <b>Admin Panel → Credit Requests</b>.
        </div>

        <p style="text-align: center; margin: 30px 0;">
          <a href="https://sxl-logistics.com/admin" style="background: #003366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block;">Review in Admin Panel</a>
        </p>
      </div>
      <div style="background: #002347; color: #aaa; padding: 20px; text-align: center; font-size: 12px;">
        (c) sXL - Super Express Logistics Center
      </div>
    </div>
  `;
  return sendEmail({ to: ADMIN_EMAIL, subject, html });
}

/* ============================================================
 *  STATUS UPDATE
 * ============================================================ */
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
          <a href="https://sxl-logistics.com/track?tn=${shipment.tracking_number}" style="background: #FF6B00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block;">Track Shipment</a>
        </p>
      </div>
      <div style="background: #002347; color: #aaa; padding: 20px; text-align: center; font-size: 12px;">
        (c) sXL - Super Express Logistics Center
      </div>
    </div>
  `;
  return sendEmail({ to: shipment.sender_email, subject, html, replyTo: ADMIN_EMAIL });
}

/* ============================================================
 *  CANCELLATION APPROVED
 * ============================================================ */
export async function sendCancellationApproved(shipment) {
  const subject = 'Cancellation Approved - ' + shipment.tracking_number + ' | sXL';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background: #DC3545; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">Cancellation Approved</h1>
      </div>
      <div style="padding: 30px 20px;">
        <p>Dear ${shipment.sender_name || 'Customer'},</p>
        <p>We confirm that your cancellation request for the following shipment has been <b>approved</b>:</p>
        <div style="background: #F8F9FA; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <div style="font-size: 12px; text-transform: uppercase; color: #666; letter-spacing: 1px;">Tracking Number</div>
          <div style="font-family: monospace; font-size: 22px; font-weight: 800; color: #DC3545; margin-top: 5px;">${shipment.tracking_number}</div>
        </div>
        <div style="background: #FFF5EB; padding: 15px; border-radius: 8px; border-left: 4px solid #FF6B00; margin: 20px 0; font-size: 14px;">
          <b>What happens next:</b><br>
          - No further action is required from your side.<br>
          - Any pickup scheduled has been cancelled.<br>
          - If you had paid, our team will process a refund within 5-7 business days.<br>
          - You can create a new booking anytime.
        </div>
        <p style="text-align: center; margin: 30px 0;">
          <a href="https://sxl-logistics.com/dashboard" style="background: #FF6B00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block;">View Dashboard</a>
        </p>
      </div>
      <div style="background: #002347; color: #aaa; padding: 20px; text-align: center; font-size: 12px;">
        (c) sXL - Super Express Logistics Center
      </div>
    </div>
  `;
  return sendEmail({ to: shipment.sender_email, subject, html, replyTo: ADMIN_EMAIL });
}

/* ============================================================
 *  CANCELLATION REJECTED
 * ============================================================ */
export async function sendCancellationRejected(shipment, adminNote) {
  const subject = 'Cancellation Request - ' + shipment.tracking_number + ' | sXL';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background: #FF6B00; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">Cancellation Update</h1>
      </div>
      <div style="padding: 30px 20px;">
        <p>Dear ${shipment.sender_name || 'Customer'},</p>
        <p>Thank you for your cancellation request for the following shipment:</p>
        <div style="background: #F8F9FA; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <div style="font-size: 12px; text-transform: uppercase; color: #666; letter-spacing: 1px;">Tracking Number</div>
          <div style="font-family: monospace; font-size: 22px; font-weight: 800; color: #003366; margin-top: 5px;">${shipment.tracking_number}</div>
        </div>
        <p>After review, we are <b>unable to cancel this shipment at this time</b>.</p>
        ${adminNote ? `<div style="background: #FFF5EB; padding: 15px; border-radius: 8px; border-left: 4px solid #FF6B00; margin: 20px 0; font-size: 14px;">
          <b>Reason from our team:</b><br>
          <i>"${adminNote}"</i>
        </div>` : ''}
        <div style="background: #F8F9FA; padding: 15px; border-radius: 8px; border-left: 4px solid #003366; margin: 20px 0; font-size: 14px;">
          <b>What happens next:</b><br>
          - Your shipment will continue as originally scheduled.<br>
          - If you have concerns, please reply to this email.
        </div>
        <p style="text-align: center; margin: 30px 0;">
          <a href="https://sxl-logistics.com/track?tn=${shipment.tracking_number}" style="background: #FF6B00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block;">Track Shipment</a>
        </p>
      </div>
      <div style="background: #002347; color: #aaa; padding: 20px; text-align: center; font-size: 12px;">
        (c) sXL - Super Express Logistics Center
      </div>
    </div>
  `;
  return sendEmail({ to: shipment.sender_email, subject, html, replyTo: ADMIN_EMAIL });
}

/* ============================================================
 *  CREDIT APPROVED
 * ============================================================ */
export async function sendCreditApproved(user, creditLimit, creditTermsDays) {
  const subject = 'Credit Account Approved | sXL';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background: #28A745; padding: 24px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Credit Account Approved</h1>
      </div>
      <div style="padding: 32px 24px;">
        <p>Dear ${user.contact_person || user.name || 'Customer'},</p>
        <p>Great news! Your credit account application for <b>${user.company_name || 'your company'}</b> has been <b>approved</b>.</p>

        <div style="background: #E8F7EF; border: 2px solid #28A745; border-radius: 12px; padding: 24px; margin: 25px 0; text-align: center;">
          <div style="font-size: 12px; text-transform: uppercase; color: #155724; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 10px;">Your Credit Terms</div>
          <div style="font-size: 32px; font-weight: 800; color: #003366; margin-bottom: 5px;">
            USD ${Number(creditLimit).toFixed(2)}
          </div>
          <div style="color: #155724; font-weight: 700;">Credit Limit • Net ${creditTermsDays} days</div>
        </div>

        <div style="background: #FFF5EB; padding: 15px; border-radius: 8px; border-left: 4px solid #FF6B00; margin: 20px 0; font-size: 14px;">
          <b>What you can do now:</b><br>
          - Book shipments and select <b>"Credit Account"</b> as payment type<br>
          - Pay invoices within ${creditTermsDays} days after delivery<br>
          - Receive consolidated monthly statements
        </div>

        <p style="text-align: center; margin: 30px 0;">
          <a href="https://sxl-logistics.com/book" style="background: #FF6B00; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block;">Create a Booking</a>
        </p>
      </div>
      <div style="background: #002347; color: #aaa; padding: 20px; text-align: center; font-size: 12px;">
        (c) sXL - Super Express Logistics Center
      </div>
    </div>
  `;
  return sendEmail({ to: user.email, subject, html, replyTo: ADMIN_EMAIL });
}

/* ============================================================
 *  CREDIT REJECTED
 * ============================================================ */
export async function sendCreditRejected(user, adminNote) {
  const subject = 'Credit Account Application Update | sXL';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background: #DC3545; padding: 24px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">Credit Application Update</h1>
      </div>
      <div style="padding: 32px 24px;">
        <p>Dear ${user.contact_person || user.name || 'Customer'},</p>
        <p>Thank you for your interest in opening a credit account with sXL for <b>${user.company_name || 'your company'}</b>.</p>

        <p>After careful review, we are <b>unable to approve your credit account request at this time</b>.</p>

        ${adminNote ? `<div style="background: #FFF5EB; padding: 15px; border-radius: 8px; border-left: 4px solid #FF6B00; margin: 20px 0; font-size: 14px;">
          <b>Reason from our team:</b><br>
          <i>"${adminNote}"</i>
        </div>` : ''}

        <div style="background: #F8F9FA; padding: 15px; border-radius: 8px; border-left: 4px solid #003366; margin: 20px 0; font-size: 14px;">
          <b>What you can still do:</b><br>
          - Continue booking shipments with <b>Prepaid</b> or <b>Collect</b> payment<br>
          - Reapply at any time from your account page
        </div>

        <p style="text-align: center; margin: 30px 0;">
          <a href="https://sxl-logistics.com/account" style="background: #003366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block;">Go to My Account</a>
        </p>
      </div>
      <div style="background: #002347; color: #aaa; padding: 20px; text-align: center; font-size: 12px;">
        (c) sXL - Super Express Logistics Center
      </div>
    </div>
  `;
  return sendEmail({ to: user.email, subject, html, replyTo: ADMIN_EMAIL });
}

/* ============================================================
 *  WAREHOUSE DETAILS (for self-delivery customers)
 * ============================================================ */
export async function sendWarehouseDetails(shipment, warehouse) {
  const subject = 'Warehouse Delivery Instructions - ' + shipment.tracking_number + ' | sXL';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background: #FF6B00; padding: 24px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">Warehouse Delivery Instructions</h1>
      </div>
      <div style="padding: 32px 24px;">
        <p>Dear ${shipment.sender_name || 'Customer'},</p>
        <p>Thank you for choosing <b>self-delivery</b> for tracking number:</p>

        <div style="background: #F8F9FA; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <div style="font-family: monospace; font-size: 22px; font-weight: 800; color: #003366;">${shipment.tracking_number}</div>
        </div>

        <p>Please deliver your shipment to the following address:</p>

        <div style="background: #FFF5EB; border: 2px solid #FF6B00; border-radius: 12px; padding: 24px; margin: 20px 0;">
          <div style="font-size: 12px; text-transform: uppercase; color: #8B4500; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 12px;">Warehouse Address</div>
          <div style="font-size: 16px; font-weight: 800; color: #003366; margin-bottom: 10px;">${warehouse.name || 'sXL Warehouse'}</div>
          <div style="font-size: 14px; line-height: 1.9; color: #343A40;">
            ${warehouse.address || ''}<br>
            ${warehouse.city || ''}${warehouse.state ? ', ' + warehouse.state : ''}<br>
            ${warehouse.country || ''}
          </div>
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #FF6B00; font-size: 14px; line-height: 1.9;">
            <div><b>📞 Phone:</b> ${warehouse.phone || '-'}</div>
            <div><b>📧 Email:</b> ${warehouse.email || '-'}</div>
            <div><b>🕐 Hours:</b> ${warehouse.hours || '-'}</div>
          </div>
        </div>

        <div style="background: #F8F9FA; padding: 15px; border-radius: 8px; border-left: 4px solid #003366; margin: 20px 0; font-size: 14px;">
          <b>Please bring:</b><br>
          - This tracking number: <b>${shipment.tracking_number}</b><br>
          - Your shipment (properly packed and labeled)<br>
          - This email (as reference)
        </div>

        <p style="color: #666; font-size: 13px; margin-top: 30px;">
          Need help? Reply to this email or contact us at support@sxl-logistics.com
        </p>
      </div>
      <div style="background: #002347; color: #aaa; padding: 20px; text-align: center; font-size: 12px;">
        (c) sXL - Super Express Logistics Center
      </div>
    </div>
  `;
  return sendEmail({ to: shipment.sender_email, subject, html, replyTo: ADMIN_EMAIL });
}

/* ============================================================
 *  INVOICE — send to customer
 * ============================================================ */
export async function sendInvoiceEmail(shipment, invoice) {
  const subject = 'Invoice ' + invoice.invoice_number + ' - ' + shipment.tracking_number + ' | sXL';
  const issueDate = invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
  const dueDate = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
  const pdfUrl = 'https://sxl-logistics.com/api/pdf/invoice/' + invoice.invoice_id;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background: #003366; padding: 24px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Invoice from sXL</h1>
      </div>
      <div style="padding: 32px 24px;">
        <p>Dear ${shipment.sender_name || 'Customer'},</p>
        <p>Please find your invoice details below for the following shipment:</p>

        <div style="background: #F8F9FA; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <div style="font-size: 12px; text-transform: uppercase; color: #666; letter-spacing: 1px;">Tracking Number</div>
          <div style="font-family: monospace; font-size: 22px; font-weight: 800; color: #003366; margin-top: 5px;">${shipment.tracking_number}</div>
        </div>

        <div style="background: #FFF5EB; border: 2px solid #FF6B00; border-radius: 12px; padding: 24px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #8B4500; font-size: 13px; font-weight: 700;">Invoice Number</span>
            <span style="font-family: monospace; font-weight: 800; color: #003366;">${invoice.invoice_number}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #8B4500; font-size: 13px; font-weight: 700;">Issue Date</span>
            <span style="color: #343A40;">${issueDate}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #8B4500; font-size: 13px; font-weight: 700;">Due Date</span>
            <span style="color: #343A40;">${dueDate}</span>
          </div>
          <div style="border-top: 1px dashed #FF6B00; padding-top: 12px; margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #8B4500; font-size: 14px; font-weight: 800;">Total Amount</span>
            <span style="font-size: 22px; font-weight: 800; color: #FF6B00;">${invoice.currency || 'USD'} ${Number(invoice.amount || 0).toFixed(2)}</span>
          </div>
        </div>

        <p style="text-align: center; margin: 30px 0;">
          <a href="${pdfUrl}" style="background: #FF6B00; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block;">📄 Download Invoice PDF</a>
        </p>

        <div style="background: #F8F9FA; padding: 15px; border-radius: 8px; border-left: 4px solid #003366; margin: 20px 0; font-size: 14px;">
          <b>Payment details will be shared separately.</b><br>
          For any questions, please reply to this email.
        </div>

        <p style="color: #666; font-size: 13px; margin-top: 30px;">
          Thank you for your business.<br>
          sXL - Super Express Logistics Center
        </p>
      </div>
      <div style="background: #002347; color: #aaa; padding: 20px; text-align: center; font-size: 12px;">
        (c) sXL - Super Express Logistics Center
      </div>
    </div>
  `;
  return sendEmail({ to: shipment.sender_email, subject, html, replyTo: ADMIN_EMAIL });
}

/* ============================================================
 *  E.1 — ADMIN ALERT: BOOKING EDITED BY ADMIN
 *
 *  changeList: array of { label, oldVal, newVal, isPublic }
 *  reason:     optional string (Reason for Change)
 *  editorInfo: string — e.g. 'ADMIN' or a user ID
 * ============================================================ */
export async function sendAdminEditNotification(shipment, changeList, reason, editorInfo) {
  const subject = '✏️ Booking Edited - ' + shipment.tracking_number;

  const changes = Array.isArray(changeList) ? changeList : [];

  const fmtTimestamp = () => {
    try {
      const d = new Date();
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const dateStr = String(d.getUTCDate()).padStart(2,'0') + ' ' + months[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
      const timeStr = String(d.getUTCHours()).padStart(2,'0') + ':' + String(d.getUTCMinutes()).padStart(2,'0');
      return dateStr + ' ' + timeStr + ' UTC';
    } catch (e) { return new Date().toISOString(); }
  };

  const esc = (v) => {
    if (v === null || v === undefined || v === '') return '<i style="color:#ADB5BD;">(empty)</i>';
    return String(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };

  const rowsHtml = changes.length === 0
    ? `<tr><td colspan="3" style="padding: 12px; color: #6C757D; font-style: italic; text-align: center;">No field changes recorded.</td></tr>`
    : changes.map((c) => {
        const scopeBadge = c.isPublic
          ? '<span style="display:inline-block; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:800; background:#FFF5EB; color:#8B4500; letter-spacing:0.5px;">CUSTOMER-FACING</span>'
          : '<span style="display:inline-block; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:800; background:#E9ECEF; color:#495057; letter-spacing:0.5px;">INTERNAL</span>';
        return `
          <tr style="border-bottom: 1px solid #F1F3F5;">
            <td style="padding: 10px 12px; vertical-align: top;">
              <div style="font-weight: 700; color: #003366; font-size: 13px;">${esc(c.label)}</div>
              <div style="margin-top: 4px;">${scopeBadge}</div>
            </td>
            <td style="padding: 10px 12px; vertical-align: top; font-size: 13px; color: #6C757D;">
              ${esc(c.oldVal)}
            </td>
            <td style="padding: 10px 12px; vertical-align: top; font-size: 13px; color: #155724; font-weight: 600;">
              ${esc(c.newVal)}
            </td>
          </tr>
        `;
      }).join('');

  const reasonHtml = (reason && String(reason).trim())
    ? `
      <div style="background: #FFF5EB; border-left: 4px solid #FF6B00; border-radius: 8px; padding: 14px 18px; margin: 20px 0;">
        <div style="font-size: 11px; text-transform: uppercase; color: #8B4500; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 6px;">Reason for Change</div>
        <div style="font-size: 14px; font-style: italic; color: #343A40;">"${esc(reason)}"</div>
      </div>
    `
    : '';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 720px; margin: 0 auto; color: #333;">
      <div style="background: #003366; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 20px;">✏️ Booking Edited</h1>
      </div>
      <div style="padding: 25px 20px;">
        <div style="background: #FFF5EB; padding: 15px; border-radius: 8px; border-left: 4px solid #FF6B00; margin-bottom: 20px;">
          <b>Tracking:</b> <span style="font-family: monospace; font-size: 15px;">${esc(shipment.tracking_number)}</span>
        </div>

        <table style="width: 100%; font-size: 14px; line-height: 1.8; margin-bottom: 20px;">
          <tr><td style="color: #666; width: 140px;">Shipper:</td><td><b>${esc(shipment.sender_name) || '-'}</b></td></tr>
          <tr><td style="color: #666;">Consignee:</td><td><b>${esc(shipment.recipient_name) || '-'}</b></td></tr>
          <tr><td style="color: #666;">Route:</td><td><b>${esc(shipment.origin)} → ${esc(shipment.destination)}</b></td></tr>
          <tr><td style="color: #666;">Ship Mode:</td><td><b>${esc(shipment.ship_mode)}${shipment.sea_load_type ? ' · ' + esc(shipment.sea_load_type) : ''}</b></td></tr>
          <tr><td style="color: #666;">Current Status:</td><td><b>${esc(shipment.status)}</b></td></tr>
        </table>

        ${reasonHtml}

        <h3 style="color: #003366; font-size: 15px; margin-top: 24px; margin-bottom: 8px;">
          Fields changed (${changes.length})
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; background: #FAFBFC; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #E9ECEF;">
              <th style="padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #003366;">Field</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #003366;">Old Value</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #003366;">New Value</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="background: #F8F9FA; border-radius: 8px; padding: 14px 18px; margin-top: 24px; font-size: 13px; color: #495057; line-height: 1.8;">
          <div><b>Edited by:</b> ${esc(editorInfo) || 'Admin'}</div>
          <div><b>Edited at:</b> ${fmtTimestamp()}</div>
        </div>

        <p style="text-align: center; margin: 30px 0;">
          <a href="https://sxl-logistics.com/admin" style="background: #003366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block;">Open Admin Panel</a>
        </p>
      </div>
      <div style="background: #002347; color: #aaa; padding: 20px; text-align: center; font-size: 12px;">
        (c) sXL - Super Express Logistics Center
      </div>
    </div>
  `;
  return sendEmail({ to: ADMIN_EMAIL, subject, html });
}
