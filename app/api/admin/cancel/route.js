import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

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
 * GET: List cancellation requests
 */
export async function GET(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ success: false, error: 'Permission denied.' });

    const { data, error } = await serviceSupabase
      .from('shipments')
      .select('*')
      .eq('status', 'Cancellation Requested')
      .order('last_update', { ascending: false });

    if (error) return NextResponse.json({ success: false, error: error.message });

    const list = (data || []).map((s) => ({
      trackingNumber: s.tracking_number,
      senderName: s.sender_name,
      senderEmail: s.sender_email,
      recipientName: s.recipient_name,
      origin: s.origin,
      destination: s.destination,
      weight: s.total_weight,
      reason: extractReason(s.special_instruction),
      requestedAt: s.last_update,
    }));

    return NextResponse.json({ success: true, requests: list });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

/**
 * POST: Approve or reject cancellation
 * Body: { trackingNumber, action: 'approve'|'reject', adminNote }
 */
export async function POST(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ success: false, error: 'Permission denied.' });

    const body = await request.json();
    const trackingNumber = String(body.trackingNumber || '').trim().toUpperCase();
    const action = body.action;
    const adminNote = String(body.adminNote || '').trim();

    if (!trackingNumber || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid parameters.' });
    }

    const { data: shipment, error: fetchErr } = await serviceSupabase
      .from('shipments')
      .select('*')
      .eq('tracking_number', trackingNumber)
      .maybeSingle();

    if (fetchErr) return NextResponse.json({ success: false, error: fetchErr.message });
    if (!shipment) return NextResponse.json({ success: false, error: 'Shipment not found.' });

    let newStatus;
    let historyNote;

    if (action === 'approve') {
      newStatus = 'Cancelled';
      historyNote = 'Cancellation APPROVED by admin.' + (adminNote ? ' Note: ' + adminNote : '');
    } else {
      newStatus = 'Booked';
      historyNote = 'Cancellation REJECTED by admin.' + (adminNote ? ' Note: ' + adminNote : '');
    }

    // Update shipment
    const { error: updateErr } = await serviceSupabase
      .from('shipments')
      .update({
        status: newStatus,
        last_update: new Date().toISOString(),
      })
      .eq('tracking_number', trackingNumber);

    if (updateErr) return NextResponse.json({ success: false, error: updateErr.message });

    // Tracking history
    await serviceSupabase.from('tracking_history').insert({
      tracking_number: trackingNumber,
      status: newStatus,
      location: shipment.origin || '',
      notes: historyNote,
      updated_by: session.userId,
    });

    return NextResponse.json({ success: true, newStatus });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

function extractReason(text) {
  if (!text) return '';
  const match = String(text).match(/\[CANCEL REASON\]\s*(.+)/);
  return match ? match[1].trim() : '';
}
