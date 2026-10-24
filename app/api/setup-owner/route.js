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
    
    let userId;

    // 1. Find the user in Auth
    const { data: usersData, error: listError } = await serviceSupabase.auth.admin.listUsers();
    if (listError) throw listError;

    const existingUser = usersData.users.find(u => u.email === email);

    if (existingUser) {
      // User exists! Force update the password.
      userId = existingUser.id;
      const { error: updateAuthError } = await serviceSupabase.auth.admin.updateUserById(userId, { password });
      if (updateAuthError) throw updateAuthError;
    } else {
      // User doesn't exist, create them.
      const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true
      });
      if (authError) throw authError;
      userId = authData.user.id;
    }

    // 2. Force the role to be 'owner' in your public users table
    const { error: dbError } = await serviceSupabase
      .from('users')
      .upsert({
        id: userId,
        email: email,
        role: 'owner',
        name: 'Showrov Owner',
        user_id: userId
      }, { onConflict: 'id' });

    // Fallback just in case the table structure is slightly different
    if (dbError) {
      await serviceSupabase.from('users').update({ role: 'owner' }).eq('email', email);
      await serviceSupabase.from('users').update({ role: 'owner' }).eq('id', userId);
    }

    return NextResponse.json({ 
      success: true, 
      message: '✅ Owner account password and role forcefully updated!',
      email: email,
      password: password
    });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
