import { createClient, createServiceRoleClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Single DB query to check role (avoids separate isSuperAdmin call)
  const db = createServiceRoleClient();
  const { data: appUser } = await db
    .from('adminpkm_users')
    .select('role')
    .eq('email', (user.email || '').toLowerCase())
    .single();

  return (
    <>
      <Navbar userEmail={user.email || ''} isAdmin={appUser?.role === 'super_admin'} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </>
  );
}
