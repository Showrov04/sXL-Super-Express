import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    const email = 'showrov@sxl-logistics.com';
    const password = 'sXL@Owner2026!'; // Your new password

    // 1. Create the user in Supabase Auth
    const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true // Skips the email verification code
    });

    if (authError && authError.message !== 'User already registered') {
      throw authError;
    }

    let userId = authData?.user?.id;

    // If the user already existed, we need to find their ID
    if (!userId) {
      const { data: usersData } = await serviceSupabase.auth.admin.listUsers();
      const existingUser = usersData.users.find(u => u.email === email);
      if (existingUser) userId = existingUser.id;
    }

    if (!userId) throw new Error('Could not find or create the user.');

    // 2. Add or update the user in your public 'users' table to be the Owner
    const { error: dbError } = await serviceSupabase
      .from('users')
      .upsert({
        id: userId,
        email: email,
        role: 'owner',
        name: 'Showrov Owner',
        user_id: userId
      }, { onConflict: 'id' });

    // Fallback update
    if (dbError) {
      await serviceSupabase.from('users').update({ role: 'owner' }).eq('id', userId);
    }

    return NextResponse.json({ 
      success: true, 
      message: '✅ Owner account successfully created!',
      email: email,
      password: password
    });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
