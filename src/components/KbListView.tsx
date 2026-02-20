'use client';

import { useEffect, useState, useCallback } from 'react';
import SearchBar from '@/components/SearchBar';
import CategoryFilter from '@/components/CategoryFilter';
import TagFilter from '@/components/TagFilter';
import FaqCard from '@/components/FaqCard';
import type { FaqEntry, Category, Tag } from '@/types';

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
        <a
          href="/api/export"
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
        >
          Export as MD
        </a>
      </div>

      <div className="space-y-4 mb-6">
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
        <div className="text-center py-12">
          <p className="text-red-600 mb-2">{error}</p>
          <button
            onClick={fetchFaqs}
            className="text-blue-600 hover:underline text-sm"
          >
            Try again
          </button>
        </div>
      ) : loading ? (
        <p className="text-gray-500 text-center py-12">Loading...</p>
      ) : faqs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>{searchQuery ? 'No results found.' : 'No FAQ entries yet.'}</p>
          {!searchQuery && (
            <a
              href="/submit"
              className="text-blue-600 hover:underline mt-2 inline-block"
            >
              Contribute a voice note to get started
            </a>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map((faq) => (
            <FaqCard key={faq.id} entry={faq} />
          ))}
        </div>
      )}
    </div>
  );
}
