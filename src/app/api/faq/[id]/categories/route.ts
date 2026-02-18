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

  const { categoryIds } = await request.json();

  if (!Array.isArray(categoryIds)) {
    return NextResponse.json({ error: 'categoryIds must be an array' }, { status: 400 });
  }

  // Delete existing assignments
  await supabase
    .from('adminpkm_faq_entry_categories')
    .delete()
    .eq('faq_entry_id', id);

  // Insert new assignments
  if (categoryIds.length > 0) {
    const rows = categoryIds.map((categoryId: string) => ({
      faq_entry_id: id,
      category_id: categoryId,
    }));

    const { error } = await supabase
      .from('adminpkm_faq_entry_categories')
      .insert(rows);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
