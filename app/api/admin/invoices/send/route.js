import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendInvoiceEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function requireAdmin(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;

  const { data: session } = await serviceSupabase
    .from('sessions')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (!session) return null;

  const expiresAt = new Date(session.expires_at).getTime();
  if (isNaN(expiresAt) || expiresAt < Date.now()) return null;

  if (session.role !== 'admin' && session.role !== 'staff') return null;

  return { userId: session.user_id, role: session.role };
}

/**
 * POST — send invoice email to customer
 * Body: { trackingNumber }
 * Requires an invoice to already exist for this shipment.
 */
export async function POST(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Permission denied.' });
    }

    const body = await request.json();
    const trackingNumber = String(body.trackingNumber || '').trim().toUpperCase();

    if (!trackingNumber) {
      return NextResponse.json({ success: false, error: 'Tracking number required.' });
    }

    // Fetch shipment
    const { data: shipment, error: shipErr } = await serviceSupabase
      .from('shipments')
      .select('*')
      .eq('tracking_number', trackingNumber)
      .maybeSingle();

    if (shipErr) return NextResponse.json({ success: false, error: shipErr.message });
    if (!shipment) return NextResponse.json({ success: false, error: 'Shipment not found.' });

    if (!shipment.sender_email) {
      return NextResponse.json({ success: false, error: 'Shipper has no email.' });
    }

    // Find invoice for this shipment — prefer individual, then monthly
    const { data: relatedInvoices } = await serviceSupabase
      .from('invoices')
      .select('*')
      .ilike('tracking_numbers', '%' + trackingNumber + '%');

    if (!relatedInvoices || relatedInvoices.length === 0) {
      return NextResponse.json({ success: false, error: 'No invoice found. Please issue an invoice first.' });
    }

    // Prefer individual over monthly
    const invoice =
      relatedInvoices.find((inv) => inv.type === 'individual') ||
      relatedInvoices.find((inv) => inv.type === 'monthly-summary') ||
      relatedInvoices[0];

    // Send the email
    const result = await sendInvoiceEmail(shipment, invoice);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Failed to send email.' });
    }

    const now = new Date().toISOString();

    // Update shipment
    await serviceSupabase
      .from('shipments')
      .update({
        invoice_sent_at: now,
        last_update: now,
      })
      .eq('tracking_number', trackingNumber);

    // Update the invoice
    await serviceSupabase
      .from('invoices')
      .update({ sent_at: now })
      .eq('invoice_id', invoice.invoice_id);

    return NextResponse.json({
      success: true,
      invoiceNumber: invoice.invoice_number,
      sentAt: now,
      sentTo: shipment.sender_email,
    });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
