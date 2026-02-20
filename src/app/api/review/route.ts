import { createClient, createServiceRoleClient } from '@/lib/supabase-server';
import { isSuperAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email || !(await isSuperAdmin(user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = createServiceRoleClient();

  // Fetch entries needing review (all review statuses)
  const { data, error } = await db
    .from('adminpkm_faq_entries')
    .select('*, categories:adminpkm_faq_entry_categories(category:adminpkm_categories(*))')
    .in('review_status', ['needs_review', 'pending_new', 'pending_merge'])
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Collect voice note IDs for uploader attribution
  const vnIds = new Set<string>();
  for (const entry of data || []) {
    if (entry.source_voice_note_id) vnIds.add(entry.source_voice_note_id);
    if (entry.conflicting_source_voice_note_id) vnIds.add(entry.conflicting_source_voice_note_id);
  }

  // Fetch voice note metadata (uploader email + source type)
  let vnMap: Record<string, { user_email: string | null; source_type: string }> = {};
  if (vnIds.size > 0) {
    const { data: vnData } = await db
      .from('adminpkm_voice_notes')
      .select('id, user_email, source_type')
      .in('id', Array.from(vnIds));
    for (const vn of vnData || []) {
      vnMap[vn.id] = { user_email: vn.user_email, source_type: vn.source_type };
    }
  }

  // Flatten nested join results and attach uploader info
  const flattened = (data || []).map((entry: Record<string, unknown>) => {
    const sourceVnId = entry.source_voice_note_id as string | null;
    const conflictVnId = entry.conflicting_source_voice_note_id as string | null;
    const sourceVn = sourceVnId ? vnMap[sourceVnId] : null;
    const conflictVn = conflictVnId ? vnMap[conflictVnId] : null;

    return {
      ...entry,
      categories: ((entry.categories as { category: unknown }[]) || []).map((c) => c.category),
      uploader_email: sourceVn?.user_email || conflictVn?.user_email || null,
      source_type: sourceVn?.source_type || conflictVn?.source_type || 'audio',
    };
  });

  return NextResponse.json(flattened);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email || !(await isSuperAdmin(user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { entryId, action, editedAnswer } = await request.json();

  if (!entryId || !action) {
    return NextResponse.json({ error: 'entryId and action required' }, { status: 400 });
  }

  const db = createServiceRoleClient();

  // Helper: approve with cleared conflict fields
  const approveAndClear = (answer?: string) =>
    db
      .from('adminpkm_faq_entries')
      .update({
        ...(answer !== undefined ? { answer } : {}),
        review_status: 'approved',
        conflicting_answer: null,
        conflicting_source_voice_note_id: null,
        conflicting_transcript_excerpt: null,
      })
      .eq('id', entryId);

  let dbError;

  if (action === 'keep_original') {
    const { error } = await approveAndClear();
    dbError = error;
  } else if (action === 'use_new') {
    const { data: entry, error: fetchErr } = await db
      .from('adminpkm_faq_entries')
      .select('conflicting_answer')
      .eq('id', entryId)
      .single();
    if (fetchErr || !entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }
    const { error } = await approveAndClear(entry.conflicting_answer);
    dbError = error;
  } else if (action === 'edit' && editedAnswer) {
    const { error } = await approveAndClear(editedAnswer);
    dbError = error;
  } else if (action === 'approve_new') {
    const { error } = await db
      .from('adminpkm_faq_entries')
      .update({ review_status: 'approved' })
      .eq('id', entryId);
    dbError = error;
  } else if (action === 'reject_new') {
    const { error: catErr } = await db
      .from('adminpkm_faq_entry_categories')
      .delete()
      .eq('faq_entry_id', entryId);
    if (catErr) {
      return NextResponse.json({ error: `Failed to remove categories: ${catErr.message}` }, { status: 500 });
    }
    const { error } = await db
      .from('adminpkm_faq_entries')
      .delete()
      .eq('id', entryId);
    dbError = error;
  } else if (action === 'approve_merge') {
    const { data: entry, error: fetchErr } = await db
      .from('adminpkm_faq_entries')
      .select('conflicting_answer')
      .eq('id', entryId)
      .single();
    if (fetchErr || !entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }
    const { error } = await approveAndClear(entry.conflicting_answer);
    dbError = error;
  } else if (action === 'reject_merge') {
    const { error } = await approveAndClear();
    dbError = error;
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  if (dbError) {
    return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
