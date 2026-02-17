'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

const baseLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/submit', label: 'Submit' },
  { href: '/submissions', label: 'Submissions' },
  { href: '/kb', label: 'Knowledge Base' },
];

const adminLinks = [
  { href: '/review', label: 'Review' },
];

export default function Navbar({ userEmail, isAdmin }: { userEmail: string; isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-bold text-lg text-gray-900">
              PEP Admin FAQs
            </Link>
            <div className="hidden sm:flex items-center gap-1">
              {[...baseLinks, ...(isAdmin ? adminLinks : [])].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:block">{userEmail}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
        {/* Mobile nav */}
        <div className="sm:hidden flex gap-1 pb-2 overflow-x-auto">
          {[...baseLinks, ...(isAdmin ? adminLinks : [])].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${
                pathname === link.href
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
