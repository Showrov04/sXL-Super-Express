import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

export async function POST(request) {
  try {
    const session = await getSessionUser(request);
    if (!session) return NextResponse.json({ success: false, error: 'Session expired.' });

    const formData = await request.formData();
    const file = formData.get('file');
    const kind = String(formData.get('kind') || 'misc').trim();

    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, error: 'No file provided.' });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'File exceeds 10 MB limit.' });
    }

    const safeName = String(file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const path = `${session.userId}/${kind}/${timestamp}-${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await serviceSupabase
      .storage
      .from('booking-docs')
      .upload(path, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadErr) {
      return NextResponse.json({ success: false, error: uploadErr.message });
    }

    const { data: publicUrlData } = serviceSupabase
      .storage
      .from('booking-docs')
      .getPublicUrl(path);

    return NextResponse.json({
      success: true,
      url: publicUrlData.publicUrl,
      path,
    });

  } catch (err) {
    console.error('[Upload] Exception:', err.message);
    return NextResponse.json({ success: false, error: err.message });
  }
}
