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

// Derive a short form (initials) from company name — up to 4 letters
function shortFormFrom(name) {
  if (!name || !String(name).trim()) return 'SXL';
  const words = String(name).trim().split(/\s+/).filter((w) => w.length > 0);
  let short = words.map((w) => w[0].toUpperCase()).join('');
  short = short.replace(/[^A-Z0-9]/g, '');
  if (short.length > 4) short = short.substring(0, 4);
  return short || 'SXL';
}

export async function GET(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Permission denied.' });
    }

    // Read from `users` table — every customer is a shipper
    const { data: users, error } = await serviceSupabase
      .from('users')
      .select('*')
      .eq('role', 'customer')
      .order('company_name', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message });
    }

    const list = (users || []).map((u) => {
      // Status: Active unless explicitly disabled
      const isActive = u.active !== false;
      return {
        shipperID: u.user_id,
        shortForm: shortFormFrom(u.company_name || u.name),
        name: u.company_name || u.name || '-',
        contactPerson: u.contact_person || u.name || '-',
        email: u.email || '-',
        phone: u.phone || '-',
        country: u.company_country || '-',
        status: isActive ? 'Active' : 'Suspended',
        suspendedAt: isActive ? null : u.suspended_at || null,
        createdAt: u.created_at || null,
      };
    });

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

    // Update users table
    const updateData = { active: newStatus === 'Active' };
    if (newStatus === 'Suspended') {
      updateData.suspended_at = new Date().toISOString();
    } else {
      updateData.suspended_at = null;
    }

    const { error } = await serviceSupabase
      .from('users')
      .update(updateData)
      .eq('user_id', shipperID);

    if (error) {
      return NextResponse.json({ success: false, error: error.message });
    }

    return NextResponse.json({ success: true, newStatus });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
