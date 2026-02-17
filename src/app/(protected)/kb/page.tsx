'use client';

import { useEffect, useState, useCallback } from 'react';
import SearchBar from '@/components/SearchBar';
import CategoryFilter from '@/components/CategoryFilter';
import FaqCard from '@/components/FaqCard';
import type { FaqEntry, Category } from '@/types';

export default function KnowledgeBasePage() {
  const [faqs, setFaqs] = useState<FaqEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCategory) params.set('category', selectedCategory);

    const [faqRes, catRes] = await Promise.all([
      fetch(`/api/faq?${params}`),
      fetch('/api/categories'),
    ]);

    if (faqRes.ok) setFaqs(await faqRes.json());
    if (catRes.ok) setCategories(await catRes.json());
    setLoading(false);
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
          onSearch={setSearchQuery}
          placeholder="Search the knowledge base..."
        />
        {categories.length > 0 && (
          <CategoryFilter
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        )}
      </div>

      {loading ? (
        <p className="text-gray-500 text-center py-12">Loading...</p>
      ) : faqs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>{searchQuery ? 'No results found.' : 'No FAQ entries yet.'}</p>
          {!searchQuery && (
            <a
              href="/submit"
              className="text-blue-600 hover:underline mt-2 inline-block"
            >
              Submit a voice note to get started
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
