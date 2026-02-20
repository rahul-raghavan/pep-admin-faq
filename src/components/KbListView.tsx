'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import SearchBar from '@/components/SearchBar';
import CategoryFilter from '@/components/CategoryFilter';
import TagFilter from '@/components/TagFilter';
import FaqCard from '@/components/FaqCard';
import type { FaqEntry, Category, Tag } from '@/types';

// Group FAQs by their first category, with "Uncategorized" as fallback
function groupByCategory(faqs: FaqEntry[]): { category: string; entries: FaqEntry[] }[] {
  const groups = new Map<string, FaqEntry[]>();

  for (const faq of faqs) {
    const catName = faq.categories && faq.categories.length > 0
      ? faq.categories[0].name
      : 'Uncategorized';
    if (!groups.has(catName)) groups.set(catName, []);
    groups.get(catName)!.push(faq);
  }

  // Sort groups alphabetically, but put "Uncategorized" last
  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return a.localeCompare(b);
    })
    .map(([category, entries]) => ({ category, entries }));
}

export default function KbListView() {
  const [faqs, setFaqs] = useState<FaqEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories and tags once on mount — they rarely change
  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then((r) => r.ok ? r.json() : []),
      fetch('/api/tags').then((r) => r.ok ? r.json() : []),
    ]).then(([cats, tgs]) => {
      setCategories(cats);
      setTags(tgs);
    }).catch((err) => console.error('Failed to load filters:', err));
  }, []);

  // Fetch FAQs when filters change
  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedTag) params.set('tag', selectedTag);

    try {
      const res = await fetch(`/api/faq?${params}`);
      if (res.ok) {
        setFaqs(await res.json());
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Failed to load (${res.status})`);
      }
    } catch (err) {
      setError('Network error — please check your connection and try again.');
      console.error('FAQ fetch error:', err);
    }
    setLoading(false);
  }, [searchQuery, selectedCategory, selectedTag]);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  // Stable callbacks to avoid re-rendering memoized filter components
  const handleCategorySelect = useCallback((id: string | null) => setSelectedCategory(id), []);
  const handleTagSelect = useCallback((id: string | null) => setSelectedTag(id), []);
  const handleSearch = useCallback((q: string) => setSearchQuery(q), []);

  // Group when showing all (no category filter and no search)
  const shouldGroup = !selectedCategory && !searchQuery;
  const grouped = useMemo(
    () => shouldGroup ? groupByCategory(faqs) : [],
    [faqs, shouldGroup]
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-heading text-base">Knowledge Base</h1>
          <p className="text-sm text-[#222]/40 mt-1">{faqs.length} articles</p>
        </div>
        <a
          href="/api/export"
          className="px-3 py-1.5 border border-[#F0EFED] text-[#222]/60 rounded-[4px] text-xs uppercase tracking-wider hover:border-[#5BB8D6]/40 hover:text-[#5BB8D6] transition-colors"
        >
          Export
        </a>
      </div>

      <div className="space-y-3 mb-8">
        <SearchBar
          onSearch={handleSearch}
          placeholder="Search the knowledge base..."
        />
        {categories.length > 0 && (
          <CategoryFilter
            categories={categories}
            selected={selectedCategory}
            onSelect={handleCategorySelect}
          />
        )}
        {tags.length > 0 && (
          <TagFilter
            tags={tags}
            selected={selectedTag}
            onSelect={handleTagSelect}
          />
        )}
      </div>

      {error ? (
        <div className="text-center py-16">
          <p className="text-[#D4705A] mb-2">{error}</p>
          <button
            onClick={fetchFaqs}
            className="text-[#5BB8D6] hover:underline text-sm"
          >
            Try again
          </button>
        </div>
      ) : loading ? (
        <p className="text-[#222]/40 text-center py-16">Loading...</p>
      ) : faqs.length === 0 ? (
        <div className="text-center py-16 text-[#222]/40">
          <p>{searchQuery ? 'No results found.' : 'No FAQ entries yet.'}</p>
          {!searchQuery && (
            <a
              href="/submit"
              className="text-[#D4705A] hover:underline mt-2 inline-block"
            >
              Contribute a voice note to get started
            </a>
          )}
        </div>
      ) : shouldGroup ? (
        // Grouped view — articles organized under category headings
        <div className="space-y-10">
          {grouped.map((group) => (
            <section key={group.category}>
              <h2 className="text-xs font-medium uppercase tracking-[0.15em] text-[#222]/40 mb-4 pb-2 border-b border-[#F0EFED]">
                {group.category}
                <span className="ml-2 text-[#222]/20">{group.entries.length}</span>
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {group.entries.map((faq) => (
                  <FaqCard key={faq.id} entry={faq} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        // Flat view — when searching or filtering by category
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map((faq) => (
            <FaqCard key={faq.id} entry={faq} />
          ))}
        </div>
      )}
    </div>
  );
}
