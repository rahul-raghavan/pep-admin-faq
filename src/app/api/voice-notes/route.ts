import { createClient, createServiceRoleClient } from '@/lib/supabase-server';
import { isSuperAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Upload to Supabase Storage
  const fileExt = file.name.split('.').pop();
  const filePath = `${user.id}/${Date.now()}.${fileExt}`;

  const serviceClient = createServiceRoleClient();

  const { error: uploadError } = await serviceClient.storage
    .from('adminpkm-voice-notes')
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}` },
      { status: 500 }
    );
  }

  // Detect source type from MIME type
  const sourceType = file.type === 'application/pdf' ? 'pdf' : 'audio';

  // Create DB row
  const { data: voiceNote, error: dbError } = await serviceClient
    .from('adminpkm_voice_notes')
    .insert({
      user_id: user.id,
      user_email: user.email,
      file_path: filePath,
      file_name: file.name,
      source_type: sourceType,
      status: 'uploaded',
    })
    .select()
    .single();

  if (dbError) {
    return NextResponse.json(
      { error: `Database error: ${dbError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(voiceNote);
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Admins see all submissions; regular users see only their own
  const db = createServiceRoleClient();
  const isAdmin = user.email ? await isSuperAdmin(user.email) : false;

  let query = db
    .from('adminpkm_voice_notes')
    .select('*')
    .order('created_at', { ascending: false });

  if (!isAdmin) {
    query = query.eq('user_id', user.id);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
