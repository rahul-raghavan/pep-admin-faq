import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch all approved, non-merged FAQ entries with categories via join table
  const { data: entries, error } = await supabase
    .from('adminpkm_faq_entries')
    .select('question, answer, categories:adminpkm_faq_entry_categories(category:adminpkm_categories(name))')
    .eq('is_merged', false)
    .eq('review_status', 'approved')
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Build markdown — list categories inline per entry instead of grouping
  const lines: string[] = [
    '# PEP Admin FAQs',
    '',
    `*Exported on ${new Date().toLocaleDateString()}*`,
    '',
  ];

  // Group by first category for structure, but show all categories inline
  const grouped: Record<string, { question: string; answer: string; allCategories: string[] }[]> = {};

  for (const entry of entries || []) {
    const cats = ((entry.categories as unknown as { category: { name: string } | null }[]) || [])
      .map((c) => c.category?.name)
      .filter(Boolean) as string[];
    const primaryCat = cats[0] || 'Uncategorized';
    if (!grouped[primaryCat]) grouped[primaryCat] = [];
    grouped[primaryCat].push({ question: entry.question, answer: entry.answer, allCategories: cats });
  }

  const sortedCategories = Object.keys(grouped).sort();

  for (const category of sortedCategories) {
    lines.push(`## ${category}`);
    lines.push('');
    for (const faq of grouped[category]) {
      lines.push(`### ${faq.question}`);
      if (faq.allCategories.length > 1) {
        lines.push(`*Categories: ${faq.allCategories.join(', ')}*`);
      }
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
