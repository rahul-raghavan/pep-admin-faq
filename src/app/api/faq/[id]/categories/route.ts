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
    .from('adminpkm_faq_entry_categories')
    .select('category:adminpkm_categories(*)')
    .eq('faq_entry_id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const categories = (data || []).map((d: { category: unknown }) => d.category);
  return NextResponse.json(categories);
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

  const { categoryIds } = await request.json();

  if (!Array.isArray(categoryIds)) {
    return NextResponse.json({ error: 'categoryIds must be an array' }, { status: 400 });
  }

  const db = createServiceRoleClient();

  // Upsert desired assignments (safe: no-op if already exists)
  if (categoryIds.length > 0) {
    const rows = categoryIds.map((categoryId: string) => ({
      faq_entry_id: id,
      category_id: categoryId,
    }));

    const { error } = await db
      .from('adminpkm_faq_entry_categories')
      .upsert(rows, { onConflict: 'faq_entry_id,category_id' });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Delete stale assignments not in the new list
  let deleteQuery = db
    .from('adminpkm_faq_entry_categories')
    .delete()
    .eq('faq_entry_id', id);

  if (categoryIds.length > 0) {
    deleteQuery = deleteQuery.not('category_id', 'in', `(${categoryIds.join(',')})`);
  }

  const { error: deleteError } = await deleteQuery;
  if (deleteError) {
    return NextResponse.json({ error: `Failed to clean up stale categories: ${deleteError.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
