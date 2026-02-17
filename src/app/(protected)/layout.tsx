import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { isSuperAdmin } from '@/lib/auth';
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

  return (
    <>
      <Navbar userEmail={user.email || ''} isAdmin={isSuperAdmin(user.email || '')} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </>
  );
}
