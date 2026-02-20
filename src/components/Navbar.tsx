'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

const primaryLinks = [
  { href: '/', label: 'KB' },
];

const secondaryLinks = [
  { href: '/submit', label: 'Contribute' },
  { href: '/submissions', label: 'Submissions' },
];

const adminLinks = [
  { href: '/review', label: 'Review' },
  { href: '/users', label: 'Users' },
  { href: '/categories', label: 'Categories' },
  { href: '/tags', label: 'Tags' },
];

function isLinkActive(href: string, pathname: string) {
  if (href === '/') {
    return pathname === '/' || pathname.startsWith('/kb');
  }
  return pathname === href;
}

const activeCls = 'text-[#5BB8D6] border-b-2 border-[#5BB8D6]';
const inactiveCls = 'text-[#222]/70 hover:text-[#5BB8D6] border-b-2 border-transparent';

export default function Navbar({ userEmail, isAdmin }: { userEmail: string; isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const allLinks = [
    ...primaryLinks,
    ...secondaryLinks,
    ...(isAdmin ? adminLinks : []),
  ];

  return (
    <nav className="bg-white border-b border-[#F0EFED]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-12 items-center">
          <div className="flex items-center gap-5">
            <Link href="/" className="font-medium text-[#222] tracking-wide whitespace-nowrap">
              PEP FAQs
            </Link>
            <div className="hidden sm:flex items-center">
              {primaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-2.5 py-1 text-[13px] font-medium whitespace-nowrap transition-colors ${
                    isLinkActive(link.href, pathname) ? activeCls : inactiveCls
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              <span className="mx-1.5 text-[#F0EFED]">|</span>

              {secondaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-2.5 py-1 text-[13px] whitespace-nowrap transition-colors ${
                    isLinkActive(link.href, pathname) ? activeCls : inactiveCls
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {isAdmin && (
                <>
                  <span className="mx-1.5 text-[#F0EFED]">|</span>
                  {adminLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`px-2.5 py-1 text-[13px] font-medium whitespace-nowrap transition-colors ${
                        isLinkActive(link.href, pathname) ? activeCls : inactiveCls
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 whitespace-nowrap">
            <span className="text-xs text-[#222]/40 hidden lg:block">{userEmail}</span>
            <button
              onClick={handleLogout}
              className="text-xs text-[#D4705A] hover:text-[#D4705A]/80 transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
        {/* Mobile nav */}
        <div className="sm:hidden flex gap-1 pb-2 overflow-x-auto">
          {allLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-2.5 py-1 text-[13px] font-medium whitespace-nowrap transition-colors ${
                isLinkActive(link.href, pathname)
                  ? 'text-[#5BB8D6] border-b-2 border-[#5BB8D6]'
                  : 'text-[#222]/70 border-b-2 border-transparent'
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
