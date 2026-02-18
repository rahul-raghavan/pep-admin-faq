import { createClient, createServiceRoleClient } from '@/lib/supabase-server';
import { isSuperAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email || !(await isSuperAdmin(user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = createServiceRoleClient();

  // Check if trying to demote self
  const { data: targetUser } = await db
    .from('adminpkm_users')
    .select('email')
    .eq('id', id)
    .single();

  if (targetUser?.email === user.email.toLowerCase()) {
    return NextResponse.json({ error: "You can't change your own role" }, { status: 400 });
  }

  const { role } = await request.json();
  const validRole = role === 'super_admin' ? 'super_admin' : 'user';

  const { data, error } = await db
    .from('adminpkm_users')
    .update({ role: validRole })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email || !(await isSuperAdmin(user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = createServiceRoleClient();

  // Check if trying to delete self
  const { data: targetUser } = await db
    .from('adminpkm_users')
    .select('email')
    .eq('id', id)
    .single();

  if (targetUser?.email === user.email.toLowerCase()) {
    return NextResponse.json({ error: "You can't remove yourself" }, { status: 400 });
  }

  const { error } = await db
    .from('adminpkm_users')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
