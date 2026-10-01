import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();
    const userId = String(body.userId || '').trim();
    const code = String(body.code || '').trim();

    if (!userId || !code) {
      return NextResponse.json({ success: false, error: 'User ID and code are required.' });
    }

    if (code.length !== 6 || !/^\d+$/.test(code)) {
      return NextResponse.json({ success: false, error: 'Code must be 6 digits.' });
    }

    // Fetch user
    const { data: user, error: fetchErr } = await serviceSupabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ success: false, error: fetchErr.message });
    }
    if (!user) {
      return NextResponse.json({ success: false, error: 'Account not found.' });
    }

    // Already verified?
    if (user.verified === true) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: 'Account is already verified.',
      });
    }

    // Check code
    if (String(user.verification_code || '') !== code) {
      return NextResponse.json({ success: false, error: 'Invalid code. Please check and try again.' });
    }

    // Check expiry
    if (user.verification_expires_at) {
      const expiresAt = new Date(user.verification_expires_at).getTime();
      if (isNaN(expiresAt) || expiresAt < Date.now()) {
        return NextResponse.json({ success: false, error: 'Code has expired. Please request a new one.' });
      }
    }

    // Mark as verified
    const { error: updateErr } = await serviceSupabase
      .from('users')
      .update({
        verified: true,
        verification_code: null,
        verification_expires_at: null,
      })
      .eq('user_id', userId);

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message });
    }

    // Create session so user is logged in
    const token = crypto.randomUUID();
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await serviceSupabase.from('sessions').insert({
      token,
      user_id: userId,
      role: user.role || 'customer',
      expires_at: sessionExpiresAt.toISOString(),
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        userId: user.user_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role || 'customer',
      },
    });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
