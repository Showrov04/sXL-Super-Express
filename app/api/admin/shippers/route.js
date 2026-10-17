import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
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
const SALT = 'sXL_Super_Express_2025_salt';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + SALT).digest('hex');
}

// Derive a short form (initials) from company name — up to 4 letters
function shortFormFrom(name) {
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
        
        // NEW FIELDS FOR AUTO-FILL
        companyAddress: u.company_address || '',
        companyCity: u.company_city || '',
        companyState: u.company_state || '',
        companyCountry: u.company_country || '',
        companyBin: u.company_bin || '',
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

    if (session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only admin can modify shippers.' });
    }

    // HANDLE PROFILE EDIT
    if (body.action === 'editProfile') {
      const {
        shipperID, companyName, contactPerson, phone, email, password,
        companyAddress, companyCity, companyState, companyCountry, companyBin
      } = body;

      if (!shipperID || !companyName || !email) {
        return NextResponse.json({ success: false, error: 'Company name, email and ID are required.' });
      }

      // Check if email already exists for ANOTHER user
      const { data: existing } = await serviceSupabase
        .from('users')
        .select('user_id')
        .eq('email', email)
        .neq('user_id', shipperID)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ success: false, error: 'Email is already in use by another shipper.' });
      }

            const updateData = {
        company_name: companyName,
        contact_person: contactPerson || null,
        phone: phone || null,
        email: email,
        company_address: companyAddress || null,
        company_city: companyCity || null,
        company_state: companyState || null,
        company_country: companyCountry || null,
        company_bin: companyBin || null,
      };

               // If password is provided, hash it before saving using the same method as login
      if (password && password.trim().length > 0) {
        updateData.password_hash = hashPassword(password.trim());
      }

      const { error: updErr } = await serviceSupabase
        .from('users')
        .update(updateData)
        .eq('user_id', shipperID);

      if (updErr) {
        return NextResponse.json({ success: false, error: updErr.message });
      }

      // Log out all devices if credentials changed
      const credentialsChanged = (password && password.trim().length > 0); // You can also check if email changed by fetching original
      if (credentialsChanged) {
        await serviceSupabase.from('sessions').delete().eq('user_id', shipperID);
      }

      return NextResponse.json({ success: true, credentialsChanged });
    }

    // HANDLE STATUS TOGGLE
    const { shipperID, newStatus } = body;

    if (!shipperID || !['Active', 'Suspended'].includes(newStatus)) {
      return NextResponse.json({ success: false, error: 'Invalid parameters.' });
    }

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
