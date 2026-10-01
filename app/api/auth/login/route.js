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

export async function POST(request) {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required.' });
    }

    // ---- Special case: admin login via env ----
    const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || '';

    if (adminEmail && email === adminEmail && password === adminPassword) {
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await serviceSupabase.from('sessions').insert({
        token,
        user_id: 'ADMIN',
        role: 'admin',
        expires_at: expiresAt.toISOString(),
      });

      return NextResponse.json({
        success: true,
        token,
        user: {
          userId: 'ADMIN',
          name: 'Administrator',
          email: adminEmail,
          role: 'admin',
        },
      });
    }

    // ---- Regular user lookup ----
    const { data: user, error } = await serviceSupabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, error: error.message });
    }

    if (!user) {
      return NextResponse.json({ success: false, error: 'Email not found.' });
    }

    // Verify password
    if (hashPassword(password) !== user.password_hash) {
      return NextResponse.json({ success: false, error: 'Incorrect password.' });
    }

    // Check active
    if (!user.active) {
      return NextResponse.json({ success: false, error: 'Account disabled. Please contact support.' });
    }

    // ⚠️ Check verification
    if (user.verified !== true) {
      // Optionally resend code if expired
      let canResend = false;
      if (user.verification_expires_at) {
        const expiresAt = new Date(user.verification_expires_at).getTime();
        if (isNaN(expiresAt) || expiresAt < Date.now()) {
          canResend = true;
        }
      }

      return NextResponse.json({
        success: false,
        error: 'Please verify your email before logging in.',
        needsVerification: true,
        userId: user.user_id,
        email: user.email,
        canResend,
      });
    }

    // ---- Create session ----
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await serviceSupabase.from('sessions').insert({
      token,
      user_id: user.user_id,
      role: user.role,
      expires_at: expiresAt.toISOString(),
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        userId: user.user_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
