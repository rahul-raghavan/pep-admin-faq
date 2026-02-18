import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const categoryId = searchParams.get('category');
  const tagId = searchParams.get('tag');

  // If filtering by category, get matching FAQ IDs first (two-step query)
  let categoryFaqIds: string[] | null = null;
  if (categoryId) {
    const { data: links } = await supabase
      .from('adminpkm_faq_entry_categories')
      .select('faq_entry_id')
      .eq('category_id', categoryId);
    categoryFaqIds = (links || []).map((l: { faq_entry_id: string }) => l.faq_entry_id);
    if (categoryFaqIds.length === 0) {
      return NextResponse.json([]);
    }
  }

  // If filtering by tag, get matching FAQ IDs first (two-step query)
  let tagFaqIds: string[] | null = null;
  if (tagId) {
    const { data: links } = await supabase
      .from('adminpkm_faq_entry_tags')
      .select('faq_entry_id')
      .eq('tag_id', tagId);
    tagFaqIds = (links || []).map((l: { faq_entry_id: string }) => l.faq_entry_id);
    if (tagFaqIds.length === 0) {
      return NextResponse.json([]);
    }
  }

  // Intersect IDs if both filters active
  let filterIds: string[] | null = null;
  if (categoryFaqIds && tagFaqIds) {
    const tagSet = new Set(tagFaqIds);
    filterIds = categoryFaqIds.filter((id) => tagSet.has(id));
    if (filterIds.length === 0) return NextResponse.json([]);
  } else if (categoryFaqIds) {
    filterIds = categoryFaqIds;
  } else if (tagFaqIds) {
    filterIds = tagFaqIds;
  }

  let query = supabase
    .from('adminpkm_faq_entries')
    .select('*, categories:adminpkm_faq_entry_categories(category:adminpkm_categories(*)), tags:adminpkm_faq_entry_tags(tag:adminpkm_tags(*))')
    .eq('is_merged', false)
    .eq('review_status', 'approved')
    .order('created_at', { ascending: false });

  if (filterIds) {
    query = query.in('id', filterIds);
  }

  if (search) {
    query = query.textSearch('fts', search, { type: 'websearch' });
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Flatten nested join results
  const flattened = (data || []).map((entry: Record<string, unknown>) => ({
    ...entry,
    categories: ((entry.categories as { category: unknown }[]) || []).map((c) => c.category),
    tags: ((entry.tags as { tag: unknown }[]) || []).map((t) => t.tag),
  }));

  return NextResponse.json(flattened);
}
