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

export async function GET(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Permission denied.' });
    }

    const { data: shippers, error } = await serviceSupabase
      .from('shippers')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message });
    }

    const list = (shippers || []).map((s) => ({
      shipperID: s.shipper_id,
      shortForm: s.short_form,
      name: s.name,
      contactPerson: s.contact_person,
      email: s.email,
      phone: s.phone,
      country: s.country,
      status: s.status || (s.active ? 'Active' : 'Suspended'),
      suspendedAt: s.suspended_at,
      createdAt: s.created_at,
    }));

    const counts = {
      total: list.length,
      active: list.filter((s) => s.status === 'Active').length,
      suspended: list.filter((s) => s.status === 'Suspended').length,
    };

    return NextResponse.json({ success: true, shippers: list, counts });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

export async function POST(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Permission denied.' });
    }

    const body = await request.json();
    const { shipperID, newStatus } = body;

    if (!shipperID || !['Active', 'Suspended'].includes(newStatus)) {
      return NextResponse.json({ success: false, error: 'Invalid parameters.' });
    }

    if (session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only admin can change shipper status.' });
    }

    const { error } = await serviceSupabase
      .from('shippers')
      .update({
        status: newStatus,
        active: newStatus === 'Active',
        suspended_at: newStatus === 'Suspended' ? new Date().toISOString() : null,
      })
      .eq('shipper_id', shipperID);

    if (error) {
      return NextResponse.json({ success: false, error: error.message });
    }

    return NextResponse.json({ success: true, newStatus });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
