import { createClient, createServiceRoleClient } from '@/lib/supabase-server';
import { isSuperAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('adminpkm_faq_entries')
    .select('*, category:adminpkm_categories(*)')
    .eq('review_status', 'needs_review')
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { entryId, action, editedAnswer } = await request.json();

  if (!entryId || !action) {
    return NextResponse.json({ error: 'entryId and action required' }, { status: 400 });
  }

  const db = createServiceRoleClient();

  if (action === 'keep_original') {
    // Keep the original answer, discard the conflict
    await db
      .from('adminpkm_faq_entries')
      .update({
        review_status: 'approved',
        conflicting_answer: null,
        conflicting_source_voice_note_id: null,
        conflicting_transcript_excerpt: null,
      })
      .eq('id', entryId);
  } else if (action === 'use_new') {
    // Replace with the conflicting answer
    const { data: entry } = await db
      .from('adminpkm_faq_entries')
      .select('conflicting_answer')
      .eq('id', entryId)
      .single();

    await db
      .from('adminpkm_faq_entries')
      .update({
        answer: entry?.conflicting_answer,
        review_status: 'approved',
        conflicting_answer: null,
        conflicting_source_voice_note_id: null,
        conflicting_transcript_excerpt: null,
      })
      .eq('id', entryId);
  } else if (action === 'edit' && editedAnswer) {
    // Use a manually edited answer
    await db
      .from('adminpkm_faq_entries')
      .update({
        answer: editedAnswer,
        review_status: 'approved',
        conflicting_answer: null,
        conflicting_source_voice_note_id: null,
        conflicting_transcript_excerpt: null,
      })
      .eq('id', entryId);
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
