import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

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

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, phone, password } = body;

    if (!name || !email || !phone || !password) {
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
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: false, error: 'Email already registered.' });
    }

    // Get next customer ID from counters
    const { data: counter } = await serviceSupabase
      .from('counters')
      .select('last_number')
      .eq('short_form', 'SXL-C')
      .single();

    const nextNumber = (counter?.last_number || 10000) + 1;
    const userId = generateCustomerId(name, nextNumber);

    // Update counter
    await serviceSupabase
      .from('counters')
      .update({ last_number: nextNumber, updated_at: new Date().toISOString() })
      .eq('short_form', 'SXL-C');

    // Insert user
    const { data: newUser, error: insertError } = await serviceSupabase
      .from('users')
      .insert({
        user_id: userId,
        name: name.trim(),
        email: email.toLowerCase(),
        phone: phone.trim(),
        password_hash: hashPassword(password),
        role: 'customer',
        notify_email: body.notifyEmail !== false,
        notify_sms: body.notifySMS !== false,
        notify_whatsapp: body.notifyWhatsApp !== false,
        notify_wechat: body.notifyWeChat === true,
        active: true,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message });
    }

    // Create session token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await serviceSupabase.from('sessions').insert({
      token,
      user_id: userId,
      role: 'customer',
      expires_at: expiresAt.toISOString(),
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        userId,
        name: name.trim(),
        email: email.toLowerCase(),
        phone: phone.trim(),
        role: 'customer',
      },
    });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
