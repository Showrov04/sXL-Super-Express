import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendStatusUpdate } from '@/lib/email';

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

export async function GET(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ success: false, error: 'Permission denied.' });

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'active';
    const shipperFilter = (searchParams.get('shipper') || '').trim();
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    const { data: all, error } = await serviceSupabase
      .from('shipments')
      .select('*')
      .order('booked_at', { ascending: false });

    if (error) return NextResponse.json({ success: false, error: error.message });

    const counts = { active: 0, awaiting: 0, paid: 0, total: all.length };
    all.forEach((s) => {
      const status = String(s.status || '').toLowerCase();
      const payment = String(s.payment_status || '').toLowerCase();
      const isDelivered = status === 'delivered';
      const isPaid = payment === 'paid';
      if (!isDelivered) counts.active++;
      else if (!isPaid) counts.awaiting++;
      else counts.paid++;
    });

    let filtered = all.filter((s) => {
      const status = String(s.status || '').toLowerCase();
      const payment = String(s.payment_status || '').toLowerCase();
      const isDelivered = status === 'delivered';
      const isPaid = payment === 'paid';
      if (tab === 'active') return !isDelivered;
      if (tab === 'awaiting') return isDelivered && !isPaid;
      if (tab === 'paid') return isDelivered && isPaid;
      return true;
    });

    if (shipperFilter) {
      const sf = shipperFilter.toLowerCase();
      filtered = filtered.filter((s) => String(s.sender_name || '').toLowerCase() === sf);
    }

    if (search) {
      filtered = filtered.filter((s) => {
        return (
          String(s.tracking_number || '').toLowerCase().includes(search) ||
          String(s.sender_name || '').toLowerCase().includes(search) ||
          String(s.recipient_name || '').toLowerCase().includes(search) ||
          String(s.sender_email || '').toLowerCase().includes(search)
        );
      });
    }

    const shipments = filtered.map((s) => ({
      trackingNumber: s.tracking_number,
      shipMode: s.ship_mode,
      serviceType: s.service_type,
      status: s.status,
      origin: s.origin,
      destination: s.destination,
      senderName: s.sender_name,
      senderEmail: s.sender_email,
      recipientName: s.recipient_name,
      weight: s.total_weight,
      shippingCost: s.shipping_cost,
      currency: s.currency || 'USD',
      paymentStatus: s.payment_status,
      paymentMethod: s.payment_method,
      paymentTerms: s.payment_terms,
      estimatedDelivery: s.estimated_delivery,
      bookedAt: s.booked_at,
      lastUpdate: s.last_update,
    }));

    return NextResponse.json({ success: true, shipments, counts });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

export async function POST(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ success: false, error: 'Permission denied.' });

    const body = await request.json();
    const { trackingNumber, newStatus, location, notes, eta } = body;

    if (!trackingNumber || !newStatus) {
      return NextResponse.json({ success: false, error: 'Tracking number and status required.' });
    }

    const updateData = {
      status: newStatus,
      last_update: new Date().toISOString(),
    };
    if (eta) updateData.estimated_delivery = eta;

    const { error: updateErr } = await serviceSupabase
      .from('shipments')
      .update(updateData)
      .eq('tracking_number', trackingNumber);

    if (updateErr) return NextResponse.json({ success: false, error: updateErr.message });

    // Insert tracking history
    await serviceSupabase.from('tracking_history').insert({
      tracking_number: trackingNumber,
      status: newStatus,
      location: location || '',
      notes: notes || '',
      updated_by: session.userId,
    });

    // Send status update email
    try {
      const { data: fullShipment } = await serviceSupabase
        .from('shipments')
        .select('*')
        .eq('tracking_number', trackingNumber)
        .maybeSingle();

      if (fullShipment && fullShipment.sender_email) {
        const emailResult = await sendStatusUpdate(fullShipment, newStatus, location, notes);
        console.log('[Email] Status update:', emailResult.success ? 'sent' : 'failed', emailResult.error || '');
      }
    } catch (emailErr) {
      console.error('[Email] Status update failed:', emailErr.message);
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
