import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch all approved, non-merged FAQ entries with categories
  const { data: entries, error } = await supabase
    .from('adminpkm_faq_entries')
    .select('question, answer, category:adminpkm_categories(name)')
    .eq('is_merged', false)
    .eq('review_status', 'approved')
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by category
  const grouped: Record<string, { question: string; answer: string }[]> = {};

  for (const entry of entries || []) {
    const cat = entry.category as any;
    const catName = (Array.isArray(cat) ? cat[0]?.name : cat?.name) || 'Uncategorized';
    if (!grouped[catName]) grouped[catName] = [];
    grouped[catName].push({ question: entry.question, answer: entry.answer });
  }

  // Build markdown
  const lines: string[] = [
    '# PEP Admin FAQs',
    '',
    `*Exported on ${new Date().toLocaleDateString()}*`,
    '',
  ];

  const sortedCategories = Object.keys(grouped).sort();

  for (const category of sortedCategories) {
    lines.push(`## ${category}`);
    lines.push('');
    for (const faq of grouped[category]) {
      lines.push(`### ${faq.question}`);
      lines.push('');
      lines.push(faq.answer);
      lines.push('');
    }
  }

  const markdown = lines.join('\n');

  return new NextResponse(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="pep-admin-faqs-${new Date().toISOString().slice(0, 10)}.md"`,
    },
  });
}
