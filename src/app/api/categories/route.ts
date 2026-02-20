import { createClient, createServiceRoleClient } from '@/lib/supabase-server';
import { isSuperAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use service role client for reads — auth is already verified above
  const db = createServiceRoleClient();
  const { data, error } = await db
    .from('adminpkm_categories')
    .select('*')
    .order('sort_order')
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' },
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email || !(await isSuperAdmin(user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { name, description } = await request.json();

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const db = createServiceRoleClient();
  const { data, error } = await db
    .from('adminpkm_categories')
    .insert({ name, description: description || null })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A category with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
