import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const OWNER_EMAIL = 'showrov@sxl-logistics.com';

// 1. Security: Only let the Owner access this API
async function requireOwner(request) {
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

  // Check if the user is the owner
  const { data: user } = await serviceSupabase
    .from('users')
    .select('email, role')
    .eq('id', session.user_id)
    .maybeSingle();

  if (!user) return null;
  if (user.role === 'owner' || user.email === OWNER_EMAIL) {
    return { userId: session.user_id };
  }

  return null; // Not the owner
}

// 2. GET: Fetch Shipments and Expenses for the Dashboard
export async function GET(request) {
  try {
    const session = await requireOwner(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Permission denied.' }, { status: 403 });
    }

    // Fetch all shipments (Revenue comes from shipping_cost)
    const { data: shipments, error: shipErr } = await serviceSupabase
      .from('shipments')
      .select('*')
      .order('booked_at', { ascending: false });

    if (shipErr) throw shipErr;

    // Fetch all expenses
    const { data: expenses, error: expErr } = await serviceSupabase
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false });

    if (expErr) throw expErr;

    return NextResponse.json({
      success: true,
      shipments: shipments || [],
      expenses: expenses || []
    });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// 3. POST: Add a new expense
export async function POST(request) {
  try {
    const session = await requireOwner(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Permission denied.' }, { status: 403 });
    }

    const body = await request.json();
    const { shipment_id, category, description, amount, expense_date } = body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Valid amount required.' }, { status: 400 });
    }

    const { data, error } = await serviceSupabase
      .from('expenses')
      .insert({
        shipment_id: shipment_id || null,
        category: category || 'Other',
        description: description || '',
        amount: parseFloat(amount),
        expense_date: expense_date || new Date().toISOString().slice(0, 10)
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, expense: data });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// 4. DELETE: Remove an expense
export async function DELETE(request) {
  try {
    const session = await requireOwner(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Permission denied.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Expense ID required.' }, { status: 400 });
    }

    const { error } = await serviceSupabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
