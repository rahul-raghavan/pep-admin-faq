import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { count: totalNotes },
    { count: completedNotes },
    { count: faqCount },
    { count: categoryCount },
  ] = await Promise.all([
    supabase.from('adminpkm_voice_notes').select('*', { count: 'exact', head: true }),
    supabase.from('adminpkm_voice_notes').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('adminpkm_faq_entries').select('*', { count: 'exact', head: true }),
    supabase.from('adminpkm_categories').select('*', { count: 'exact', head: true }),
  ]);

  const stats = [
    { label: 'Voice Notes', value: totalNotes ?? 0 },
    { label: 'Processed', value: completedNotes ?? 0 },
    { label: 'FAQ Entries', value: faqCount ?? 0 },
    { label: 'Categories', value: categoryCount ?? 0 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Link
          href="/submit"
          className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Submit Voice Note</h2>
          <p className="text-sm text-gray-500">Upload an M4A file or record audio directly</p>
        </Link>
        <Link
          href="/kb"
          className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Knowledge Base</h2>
          <p className="text-sm text-gray-500">Browse and search the FAQ knowledge base</p>
        </Link>
      </div>
    </div>
  );
}
