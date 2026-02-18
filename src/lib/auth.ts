import { createServiceRoleClient } from './supabase-server';

export async function isAllowedEmail(email: string): Promise<boolean> {
  const db = createServiceRoleClient();
  const { data } = await db
    .from('adminpkm_users')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();
  return !!data;
}

export async function isSuperAdmin(email: string): Promise<boolean> {
  const db = createServiceRoleClient();
  const { data } = await db
    .from('adminpkm_users')
    .select('role')
    .eq('email', email.toLowerCase())
    .single();
  return data?.role === 'super_admin';
}
