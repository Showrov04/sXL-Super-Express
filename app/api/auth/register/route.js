import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { sendVerificationCode } from '@/lib/email';

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

function generateCustomerId(name, currentCounter) {
  let initials = 'USR';
  if (name && name.trim()) {
    const words = name.trim().split(/\s+/).filter(w => w.length > 0);
    let derived = words.map(w => w[0].toUpperCase()).join('');
    derived = derived.replace(/[^A-Z0-9]/g, '');
    if (derived.length > 4) derived = derived.substring(0, 4);
    if (derived.length > 0) initials = derived;
  }
  return initials + '-C-' + currentCounter;
}

function generateVerificationCode() {
  // 6-digit numeric code
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request) {
  try {
    const body = await request.json();
    const companyName = String(body.companyName || '').trim();
    const contactPerson = String(body.contactPerson || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const password = String(body.password || '');

    // Validation
    if (!companyName) {
      return NextResponse.json({ success: false, error: 'Company name is required.' });
    }
    if (!contactPerson) {
      return NextResponse.json({ success: false, error: 'Contact person name is required.' });
    }
    if (!email || !phone || !password) {
      return NextResponse.json({ success: false, error: 'All fields are required.' });
    }
    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: 'Invalid email format.' });
    }

    // Check if email exists
    const { data: existing } = await serviceSupabase
      .from('users')
      .select('id, verified')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: false, error: 'Email already registered.' });
    }

    // Get next customer ID
    const { data: counter } = await serviceSupabase
      .from('counters')
      .select('last_number')
      .eq('short_form', 'SXL-C')
      .single();

    const nextNumber = (counter?.last_number || 10000) + 1;
    const userId = generateCustomerId(companyName, nextNumber);

    // Update counter
    await serviceSupabase
      .from('counters')
      .update({ last_number: nextNumber, updated_at: new Date().toISOString() })
      .eq('short_form', 'SXL-C');

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Insert user (verified = false until code entered)
    const { data: newUser, error: insertError } = await serviceSupabase
      .from('users')
      .insert({
        user_id: userId,
        name: contactPerson,               // keep 'name' = contact person
        contact_person: contactPerson,
        company_name: companyName,
        email: email,
        phone: phone,
        password_hash: hashPassword(password),
        role: 'customer',
        notify_email: body.notifyEmail !== false,
        notify_sms: body.notifySMS !== false,
        notify_whatsapp: body.notifyWhatsApp !== false,
        notify_wechat: body.notifyWeChat === true,
        active: true,
        verified: false,
        verification_code: verificationCode,
        verification_method: 'email',
        verification_expires_at: expiresAt.toISOString(),
        verification_sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message });
    }

    // Send verification email
    let emailSent = false;
    try {
      const result = await sendVerificationCode({
        to: email,
        code: verificationCode,
        contactPerson: contactPerson,
        companyName: companyName,
      });
      emailSent = result.success;
      console.log('[Register] Verification email:', emailSent ? 'sent' : 'failed', result.error || '');
    } catch (emailErr) {
      console.error('[Register] Email failed:', emailErr.message);
    }

    return NextResponse.json({
      success: true,
      userId,
      email,
      emailSent,
      message: emailSent
        ? 'Verification code sent to your email.'
        : 'Account created, but email could not be sent. Please contact support.',
    });

  } catch (err) {
    console.error('[Register] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message });
  }
}
