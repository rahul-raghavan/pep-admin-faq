import { createClient, createServiceRoleClient } from '@/lib/supabase-server';
import { isSuperAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createServiceRoleClient();
  const { data, error } = await db
    .from('adminpkm_faq_entry_tags')
    .select('tag:adminpkm_tags(*)')
    .eq('faq_entry_id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const tags = (data || []).map((d: { tag: unknown }) => d.tag);
  return NextResponse.json(tags);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = user.email ? await isSuperAdmin(user.email) : false;
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { tagIds } = await request.json();

  if (!Array.isArray(tagIds)) {
    return NextResponse.json({ error: 'tagIds must be an array' }, { status: 400 });
  }

  const db = createServiceRoleClient();

  // Upsert desired assignments (safe: no-op if already exists)
  if (tagIds.length > 0) {
    const rows = tagIds.map((tagId: string) => ({
      faq_entry_id: id,
      tag_id: tagId,
    }));

    const { error } = await db
      .from('adminpkm_faq_entry_tags')
      .upsert(rows, { onConflict: 'faq_entry_id,tag_id' });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Delete stale assignments not in the new list
  let deleteQuery = db
    .from('adminpkm_faq_entry_tags')
    .delete()
    .eq('faq_entry_id', id);

  if (tagIds.length > 0) {
    deleteQuery = deleteQuery.not('tag_id', 'in', `(${tagIds.join(',')})`);
  }

  const { error: deleteError } = await deleteQuery;
  if (deleteError) {
    return NextResponse.json({ error: `Failed to clean up stale tags: ${deleteError.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
