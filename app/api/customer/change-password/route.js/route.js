import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SALT = 'sXL_Super_Express_2025_salt';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + SALT).digest('hex');
}

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

export async function POST(request) {
  try {
    const session = await getSessionUser(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session expired. Please login again.' });
    }

    const body = await request.json();
    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');

    // Validation
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ success: false, error: 'Current password and new password are required.' });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, error: 'New password must be at least 6 characters.' });
    }
    if (currentPassword === newPassword) {
      return NextResponse.json({ success: false, error: 'New password must be different from current password.' });
    }

    // Fetch user
    const { data: user, error: fetchErr } = await serviceSupabase
      .from('users')
      .select('user_id, password_hash, email')
      .eq('user_id', session.userId)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ success: false, error: fetchErr.message });
    }
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found.' });
    }

    // Verify current password
    const currentHash = hashPassword(currentPassword);
    if (currentHash !== user.password_hash) {
      return NextResponse.json({ success: false, error: 'Current password is incorrect.' });
    }

    // Hash new password and update
    const newHash = hashPassword(newPassword);
    const { error: updateErr } = await serviceSupabase
      .from('users')
      .update({
        password_hash: newHash,
      })
      .eq('user_id', session.userId);

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message });
    }

    // Q2a = keep current session valid; do not delete any sessions.
    return NextResponse.json({ success: true, message: 'Password changed successfully.' });

  } catch (err) {
    console.error('[Change Password] Exception:', err.message);
    return NextResponse.json({ success: false, error: err.message });
  }
}
