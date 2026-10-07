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

export async function GET(request) {
  try {
    const session = await getSessionUser(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session expired.' });
    }

    const { data: user, error } = await serviceSupabase
      .from('users')
      .select('*')
      .eq('user_id', session.userId)
      .maybeSingle();

    if (error) return NextResponse.json({ success: false, error: error.message });
    if (!user) return NextResponse.json({ success: false, error: 'User not found.' });

    return NextResponse.json({
      success: true,
      profile: {
        userId: user.user_id,
        email: user.email,
        companyName: user.company_name || '',
        contactPerson: user.contact_person || user.name || '',
        phone: user.phone || '',
        companyAddress: user.company_address || '',
        companyCity: user.company_city || '',
        companyState: user.company_state || '',
        companyCountry: user.company_country || '',
        companyBin: user.company_bin || '',
        creditApproved: user.credit_approved === true,
        creditLimit: user.credit_limit || 0,
        creditTermsDays: user.credit_terms_days || 30,
        creditStatus: user.credit_request_status || null,
        creditNote: user.credit_request_note || '',
        bankName: user.bank_name || '',
        bankAccountName: user.bank_account_name || '',
        bankAccountNumber: user.bank_account_number || '',
        bankSwift: user.bank_swift || '',
        bankBranch: user.bank_branch || '',
      },
    });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

export async function POST(request) {
  try {
    const session = await getSessionUser(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session expired.' });
    }

    const body = await request.json();
    const action = body.action;

    if (action === 'saveInfo') {
      return await saveShipperInfo(session, body);
    }
    if (action === 'submitCredit') {
      return await submitCreditRequest(session, body);
    }
    if (action === 'changePassword') {
      return await changePassword(session, body);
    }
    return NextResponse.json({ success: false, error: 'Unknown action.' });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

async function saveShipperInfo(session, body) {
  const updateData = {
    company_name: String(body.companyName || '').trim() || null,
    contact_person: String(body.contactPerson || '').trim() || null,
    phone: String(body.phone || '').trim() || null,
    company_address: String(body.companyAddress || '').trim() || null,
    company_city: String(body.companyCity || '').trim() || null,
    company_state: String(body.companyState || '').trim() || null,
    company_country: String(body.companyCountry || '').trim() || null,
    company_bin: String(body.companyBin || '').trim() || null,
  };

  if (updateData.contact_person) {
    updateData.name = updateData.contact_person;
  }

  const { error } = await serviceSupabase
    .from('users')
    .update(updateData)
    .eq('user_id', session.userId);

  if (error) return NextResponse.json({ success: false, error: error.message });

  return NextResponse.json({ success: true, message: 'Profile updated.' });
}

async function submitCreditRequest(session, body) {
  const companyName = String(body.companyName || '').trim();
  const companyAddress = String(body.companyAddress || '').trim();
  const companyCountry = String(body.companyCountry || '').trim();
  const companyBin = String(body.companyBin || '').trim();
  const bankName = String(body.bankName || '').trim();
  const bankAccountName = String(body.bankAccountName || '').trim();
  const bankAccountNumber = String(body.bankAccountNumber || '').trim();

  if (!companyName) return NextResponse.json({ success: false, error: 'Company name is required.' });
  if (!companyAddress) return NextResponse.json({ success: false, error: 'Company address is required.' });
  if (!companyCountry) return NextResponse.json({ success: false, error: 'Country is required.' });
  if (!companyBin) return NextResponse.json({ success: false, error: 'BIN is required.' });
  if (!bankName) return NextResponse.json({ success: false, error: 'Bank name is required.' });
  if (!bankAccountName) return NextResponse.json({ success: false, error: 'Account holder name is required.' });
  if (!bankAccountNumber) return NextResponse.json({ success: false, error: 'Account number is required.' });

  const { data: user } = await serviceSupabase
    .from('users')
    .select('credit_request_status, credit_approved')
    .eq('user_id', session.userId)
    .maybeSingle();

  if (user?.credit_approved === true) {
    return NextResponse.json({ success: false, error: 'Your credit account is already approved.' });
  }

  if (user?.credit_request_status === 'pending') {
    return NextResponse.json({ success: false, error: 'You already have a pending credit request.' });
  }

  const { error } = await serviceSupabase
    .from('users')
    .update({
      company_name: companyName,
      company_address: companyAddress,
      company_city: String(body.companyCity || '').trim() || null,
      company_state: String(body.companyState || '').trim() || null,
      company_country: companyCountry,
      company_bin: companyBin,
      bank_name: bankName,
      bank_account_name: bankAccountName,
      bank_account_number: bankAccountNumber,
      bank_swift: String(body.bankSwift || '').trim() || null,
      bank_branch: String(body.bankBranch || '').trim() || null,
      credit_request_status: 'pending',
      credit_request_submitted_at: new Date().toISOString(),
      credit_request_note: null,
    })
    .eq('user_id', session.userId);

  if (error) return NextResponse.json({ success: false, error: error.message });

  return NextResponse.json({
    success: true,
    message: 'Credit account request submitted. Our team will review and respond within 1-2 business days.',
  });
}

async function changePassword(session, body) {
  const currentPassword = String(body.currentPassword || '');
  const newPassword = String(body.newPassword || '');

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ success: false, error: 'Current password and new password are required.' });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ success: false, error: 'New password must be at least 6 characters.' });
  }
  if (currentPassword === newPassword) {
    return NextResponse.json({ success: false, error: 'New password must be different from current password.' });
  }

  const { data: user, error: fetchErr } = await serviceSupabase
    .from('users')
    .select('user_id, password_hash')
    .eq('user_id', session.userId)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ success: false, error: fetchErr.message });
  }
  if (!user) {
    return NextResponse.json({ success: false, error: 'User not found.' });
  }

  const currentHash = hashPassword(currentPassword);
  if (currentHash !== user.password_hash) {
    return NextResponse.json({ success: false, error: 'Current password is incorrect.' });
  }

  const newHash = hashPassword(newPassword);
  const { error: updateErr } = await serviceSupabase
    .from('users')
    .update({ password_hash: newHash })
    .eq('user_id', session.userId);

  if (updateErr) {
    return NextResponse.json({ success: false, error: updateErr.message });
  }

  return NextResponse.json({ success: true, message: 'Password changed successfully.' });
}
