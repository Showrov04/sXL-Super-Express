import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendCreditApproved, sendCreditRejected } from '@/lib/email';

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
    if (!session) return NextResponse.json({ success: false, error: 'Permission denied.' });

    const { data, error } = await serviceSupabase
      .from('users')
      .select('*')
      .eq('credit_request_status', 'pending')
      .order('credit_request_submitted_at', { ascending: false });

    if (error) return NextResponse.json({ success: false, error: error.message });

    const list = (data || []).map((u) => ({
      userId: u.user_id,
      companyName: u.company_name,
      contactPerson: u.contact_person || u.name,
      email: u.email,
      phone: u.phone,
      companyAddress: u.company_address,
      companyCity: u.company_city,
      companyState: u.company_state,
      companyCountry: u.company_country,
      companyBin: u.company_bin,
      bankName: u.bank_name,
      bankAccountName: u.bank_account_name,
      bankAccountNumber: u.bank_account_number,
      bankSwift: u.bank_swift,
      bankBranch: u.bank_branch,
      submittedAt: u.credit_request_submitted_at,
    }));

    return NextResponse.json({ success: true, requests: list });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

export async function POST(request) {
  try {
    const session = await requireAdmin(request);
    if (!session) return NextResponse.json({ success: false, error: 'Permission denied.' });

    const body = await request.json();
    const userId = String(body.userId || '').trim();
    const action = body.action;
    const creditLimit = parseFloat(body.creditLimit) || 0;
    const creditTermsDays = parseInt(body.creditTermsDays, 10) || 30;
    const adminNote = String(body.adminNote || '').trim();

    if (!userId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid parameters.' });
    }

    // Fetch user
    const { data: user, error: fetchErr } = await serviceSupabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchErr) return NextResponse.json({ success: false, error: fetchErr.message });
    if (!user) return NextResponse.json({ success: false, error: 'User not found.' });

    if (user.credit_request_status !== 'pending') {
      return NextResponse.json({ success: false, error: 'No pending request for this user.' });
    }

    if (action === 'approve') {
      if (creditLimit <= 0) {
        return NextResponse.json({ success: false, error: 'Credit limit required.' });
      }

      const { error } = await serviceSupabase
        .from('users')
        .update({
          credit_approved: true,
          credit_limit: creditLimit,
          credit_terms_days: creditTermsDays,
          credit_request_status: 'approved',
          credit_approved_at: new Date().toISOString(),
          credit_approved_by: session.userId,
          credit_request_note: null,
        })
        .eq('user_id', userId);

      if (error) return NextResponse.json({ success: false, error: error.message });

      // Send email
      try {
        await sendCreditApproved(user, creditLimit, creditTermsDays);
      } catch (e) {
        console.error('[Credit] Email failed:', e.message);
      }

      return NextResponse.json({ success: true });

    } else {
      // Reject
      const { error } = await serviceSupabase
        .from('users')
        .update({
          credit_approved: false,
          credit_request_status: 'rejected',
          credit_request_note: adminNote || 'Application did not meet our criteria.',
          credit_approved_at: null,
          credit_approved_by: null,
        })
        .eq('user_id', userId);

      if (error) return NextResponse.json({ success: false, error: error.message });

      try {
        await sendCreditRejected(user, adminNote);
      } catch (e) {
        console.error('[Credit] Email failed:', e.message);
      }

      return NextResponse.json({ success: true });
    }

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
