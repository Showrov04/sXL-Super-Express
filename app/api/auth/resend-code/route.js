import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendVerificationCode } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request) {
  try {
    const body = await request.json();
    const userId = String(body.userId || '').trim();

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID required.' });
    }

    // Fetch user
    const { data: user, error: fetchErr } = await serviceSupabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchErr) return NextResponse.json({ success: false, error: fetchErr.message });
    if (!user) return NextResponse.json({ success: false, error: 'Account not found.' });

    if (user.verified === true) {
      return NextResponse.json({ success: false, error: 'Account is already verified.' });
    }

    // Rate limit — prevent spamming (60 second cooldown)
    if (user.verification_sent_at) {
      const lastSent = new Date(user.verification_sent_at).getTime();
      const secondsSince = (Date.now() - lastSent) / 1000;
      if (secondsSince < 60) {
        return NextResponse.json({
          success: false,
          error: 'Please wait ' + Math.ceil(60 - secondsSince) + ' seconds before requesting a new code.',
        });
      }
    }

    // Generate new code
    const newCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const { error: updateErr } = await serviceSupabase
      .from('users')
      .update({
        verification_code: newCode,
        verification_expires_at: expiresAt.toISOString(),
        verification_sent_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateErr) return NextResponse.json({ success: false, error: updateErr.message });

    // Send email
    const result = await sendVerificationCode({
      to: user.email,
      code: newCode,
      contactPerson: user.contact_person || user.name,
      companyName: user.company_name,
    });

    if (!result.success) {
      console.error('[Resend] Email failed:', result.error);
      return NextResponse.json({
        success: false,
        error: 'Could not send email. Please try again in a moment.',
      });
    }

    return NextResponse.json({ success: true, message: 'New code sent.' });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
