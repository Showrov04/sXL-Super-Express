import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendAdminCancelRequestAlert } from '@/lib/email';

export const dynamic = 'force-dynamic';

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getSessionUser(request) {
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

  return { userId: session.user_id, role: session.role };
}

/**
 * POST: Request cancellation (customer only)
 * Body: { trackingNumber, reason }
 */
export async function POST(request) {
  try {
    const session = await getSessionUser(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session expired.' });
    }

    const body = await request.json();
    const trackingNumber = String(body.trackingNumber || '').trim().toUpperCase();
    const reason = String(body.reason || '').trim();

    if (!trackingNumber) {
      return NextResponse.json({ success: false, error: 'Tracking number required.' });
    }
    if (!reason) {
      return NextResponse.json({ success: false, error: 'Please provide a reason for cancellation.' });
    }

    // Fetch shipment
    const { data: shipment, error: fetchErr } = await serviceSupabase
      .from('shipments')
      .select('*')
      .eq('tracking_number', trackingNumber)
      .maybeSingle();

    if (fetchErr) return NextResponse.json({ success: false, error: fetchErr.message });
    if (!shipment) return NextResponse.json({ success: false, error: 'Shipment not found.' });

    // Verify ownership
    if (shipment.booked_by !== session.userId) {
      return NextResponse.json({ success: false, error: 'Not your shipment.' });
    }

    // Only allow when status = Booked
    const currentStatus = String(shipment.status || '').toLowerCase();
    if (currentStatus !== 'booked') {
      return NextResponse.json({
        success: false,
        error: 'Cancellation is only available while the shipment is still "Booked". Once it has been picked up, please contact support.',
      });
    }

    // Update status
    const { error: updateErr } = await serviceSupabase
      .from('shipments')
      .update({
        status: 'Cancellation Requested',
        special_instruction: (shipment.special_instruction || '') + '\n[CANCEL REASON] ' + reason,
        last_update: new Date().toISOString(),
      })
      .eq('tracking_number', trackingNumber);

    if (updateErr) return NextResponse.json({ success: false, error: updateErr.message });

    // Tracking history
    await serviceSupabase.from('tracking_history').insert({
      tracking_number: trackingNumber,
      status: 'Cancellation Requested',
      location: shipment.origin || '',
      notes: 'Customer requested cancellation: ' + reason,
      updated_by: session.userId,
    });

    // G.43 — Notify admin by email
    try {
      const result = await sendAdminCancelRequestAlert(shipment, reason);
      console.log('[Cancel Request Email] Admin alert:', result.success ? 'sent' : 'failed', result.error || '');
    } catch (emailErr) {
      console.error('[Cancel Request Email] Exception:', emailErr.message);
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
