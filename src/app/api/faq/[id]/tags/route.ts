import { createClient } from '@/lib/supabase-server';
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

  const { data, error } = await supabase
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

  const { tagIds } = await request.json();

  if (!Array.isArray(tagIds)) {
    return NextResponse.json({ error: 'tagIds must be an array' }, { status: 400 });
  }

  // Delete existing assignments
  const { error: deleteError } = await supabase
    .from('adminpkm_faq_entry_tags')
    .delete()
    .eq('faq_entry_id', id);

  if (deleteError) {
    return NextResponse.json({ error: `Failed to clear tags: ${deleteError.message}` }, { status: 500 });
  }

  // Insert new assignments
  if (tagIds.length > 0) {
    const rows = tagIds.map((tagId: string) => ({
      faq_entry_id: id,
      tag_id: tagId,
    }));

    const { error } = await supabase
      .from('adminpkm_faq_entry_tags')
      .insert(rows);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
