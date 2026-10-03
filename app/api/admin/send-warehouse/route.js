import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendWarehouseDetails } from '@/lib/email';

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
 * GET — fetch current warehouse settings (used to pre-fill modal)
 */
export async function GET(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ success: false, error: 'Permission denied.' });

    const { data: rows } = await serviceSupabase
      .from('settings')
      .select('key, value')
      .in('key', [
        'warehouse_name', 'warehouse_address', 'warehouse_city',
        'warehouse_state', 'warehouse_country', 'warehouse_phone',
        'warehouse_email', 'warehouse_hours',
      ]);

    const settings = {};
    (rows || []).forEach((row) => { settings[row.key] = row.value; });

    return NextResponse.json({
      success: true,
      warehouse: {
        name: settings.warehouse_name || '',
        address: settings.warehouse_address || '',
        city: settings.warehouse_city || '',
        state: settings.warehouse_state || '',
        country: settings.warehouse_country || '',
        phone: settings.warehouse_phone || '',
        email: settings.warehouse_email || '',
        hours: settings.warehouse_hours || '',
      },
    });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

/**
 * POST — send warehouse details email
 * Body: { trackingNumber, warehouse: { name, address, city, state, country, phone, email, hours } }
 * If warehouse is not provided, falls back to settings table.
 */
export async function POST(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ success: false, error: 'Permission denied.' });

    const body = await request.json();
    const trackingNumber = String(body.trackingNumber || '').trim().toUpperCase();

    if (!trackingNumber) {
      return NextResponse.json({ success: false, error: 'Tracking number required.' });
    }

    // Fetch shipment
    const { data: shipment, error: fetchErr } = await serviceSupabase
      .from('shipments')
      .select('*')
      .eq('tracking_number', trackingNumber)
      .maybeSingle();

    if (fetchErr) return NextResponse.json({ success: false, error: fetchErr.message });
    if (!shipment) return NextResponse.json({ success: false, error: 'Shipment not found.' });

    // Must be a "No pickup" shipment
    if (shipment.pickup_service !== false) {
      return NextResponse.json({
        success: false,
        error: 'This shipment has pickup service. Warehouse email is only for self-delivery shipments.',
      });
    }

    // Warehouse details: prefer values from request body, fallback to settings
    let warehouse = body.warehouse || null;

    if (!warehouse || typeof warehouse !== 'object') {
      // Fallback: read from settings
      const { data: settingsRows } = await serviceSupabase
        .from('settings')
        .select('key, value')
        .in('key', [
          'warehouse_name', 'warehouse_address', 'warehouse_city',
          'warehouse_state', 'warehouse_country', 'warehouse_phone',
          'warehouse_email', 'warehouse_hours',
        ]);

      const settings = {};
      (settingsRows || []).forEach((row) => { settings[row.key] = row.value; });

      warehouse = {
        name: settings.warehouse_name || 'sXL Warehouse',
        address: settings.warehouse_address || '',
        city: settings.warehouse_city || '',
        state: settings.warehouse_state || '',
        country: settings.warehouse_country || '',
        phone: settings.warehouse_phone || '',
        email: settings.warehouse_email || '',
        hours: settings.warehouse_hours || '',
      };
    } else {
      // Sanitize values from request
      warehouse = {
        name: String(warehouse.name || '').trim() || 'sXL Warehouse',
        address: String(warehouse.address || '').trim(),
        city: String(warehouse.city || '').trim(),
        state: String(warehouse.state || '').trim(),
        country: String(warehouse.country || '').trim(),
        phone: String(warehouse.phone || '').trim(),
        email: String(warehouse.email || '').trim(),
        hours: String(warehouse.hours || '').trim(),
      };
    }

    // Send email
    const result = await sendWarehouseDetails(shipment, warehouse);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Email failed.' });
    }

    // Update timestamp
    await serviceSupabase
      .from('shipments')
      .update({
        warehouse_sent_at: new Date().toISOString(),
        last_update: new Date().toISOString(),
      })
      .eq('tracking_number', trackingNumber);

    return NextResponse.json({ success: true });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
