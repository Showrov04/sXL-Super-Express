import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

// GET: list addresses for current user, optional ?type=Shipper|Consignee
export async function GET(request) {
  try {
    const session = await getSessionUser(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session expired.' });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    let query = serviceSupabase
      .from('address_book')
      .select('*')
      .eq('user_id', session.userId);

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message });
    }

    const addresses = (data || []).map((a) => ({
      addressId: a.address_id,
      type: a.type,
      name: a.name,
      fullAddress: a.full_address,
      city: a.city,
      state: a.state,
      country: a.country,
      email: a.email,
      phone: a.phone,
      bin: a.bin,
    }));

    return NextResponse.json({ success: true, addresses });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

// POST: save a new address
export async function POST(request) {
  try {
    const session = await getSessionUser(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session expired.' });
    }

    const body = await request.json();
    const type = body.type === 'Consignee' ? 'Consignee' : 'Shipper';

    if (!body.name || !body.fullAddress || !body.country) {
      return NextResponse.json({ success: false, error: 'Name, Address and Country are required.' });
    }

    // Check duplicate (same user, type, name, address)
    const { data: existing } = await serviceSupabase
      .from('address_book')
      .select('address_id')
      .eq('user_id', session.userId)
      .eq('type', type)
      .eq('name', body.name)
      .eq('full_address', body.fullAddress)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, addressId: existing.address_id, duplicate: true });
    }

    const addressId = 'ADR' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();

    const { error } = await serviceSupabase
      .from('address_book')
      .insert({
        address_id: addressId,
        user_id: session.userId,
        type,
        name: body.name,
        full_address: body.fullAddress,
        city: body.city || null,
        state: body.state || null,
        country: body.country,
        email: body.email || null,
        phone: body.phone || null,
        bin: body.bin || null,
      });

    if (error) {
      return NextResponse.json({ success: false, error: error.message });
    }

    return NextResponse.json({ success: true, addressId });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
