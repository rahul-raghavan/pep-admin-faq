import { createClient, createServiceRoleClient } from '@/lib/supabase-server';
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

  // Use service role client for reads — auth is already verified above
  const db = createServiceRoleClient();
  const { data, error } = await db
    .from('adminpkm_faq_entries')
    .select('*, categories:adminpkm_faq_entry_categories(category:adminpkm_categories(*)), tags:adminpkm_faq_entry_tags(tag:adminpkm_tags(*))')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  // Flatten nested join results
  const flattened = {
    ...data,
    categories: ((data.categories as { category: unknown }[]) || []).map((c) => c.category),
    tags: ((data.tags as { tag: unknown }[]) || []).map((t) => t.tag),
  };

  return NextResponse.json(flattened);
}
