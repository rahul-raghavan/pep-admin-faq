'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import MarkdownContent from '@/components/MarkdownContent';
import ContributePanel from '@/components/ContributePanel';
import CategoryAssigner from '@/components/CategoryAssigner';
import TagAssigner from '@/components/TagAssigner';
import type { FaqEntry, Category, Tag } from '@/types';

export default function FaqDetailPage() {
  const { id } = useParams();
  const [entry, setEntry] = useState<FaqEntry | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntry = () => {
    fetch(`/api/faq/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setEntry(data);
        setLoading(false);
      });
  };

  // Fetch entry + reference data in parallel on mount
  useEffect(() => {
    Promise.all([
      fetch(`/api/faq/${id}`).then((r) => r.ok ? r.json() : null),
      fetch('/api/categories').then((r) => r.ok ? r.json() : []),
      fetch('/api/tags').then((r) => r.ok ? r.json() : []),
    ]).then(([entryData, cats, tgs]) => {
      setEntry(entryData);
      setAllCategories(cats);
      setAllTags(tgs);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return <p className="text-gray-500 text-center py-12">Loading...</p>;
  }

  if (!entry) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">FAQ entry not found.</p>
        <Link href="/" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to Knowledge Base
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/"
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block"
      >
        &larr; Back to Knowledge Base
      </Link>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {entry.categories?.map((cat) => (
            <span key={cat.id} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
              {cat.name}
            </span>
          ))}
          {entry.tags?.map((tag) => (
            <span
              key={tag.id}
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{ backgroundColor: tag.color + '20', color: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-4">{entry.question}</h1>

        <MarkdownContent content={entry.answer} />

        {entry.source_transcript_excerpt && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
              Source Transcript
            </p>
            <blockquote className="text-sm text-gray-500 italic border-l-2 border-gray-200 pl-3">
              {entry.source_transcript_excerpt}
            </blockquote>
          </div>
        )}

        {entry.review_status === 'approved' && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <ContributePanel faqEntryId={entry.id} faqQuestion={entry.question} />
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-100 space-y-4">
          <CategoryAssigner
            faqEntryId={entry.id}
            currentCategories={entry.categories || []}
            allCategories={allCategories}
            onUpdate={fetchEntry}
          />
          <TagAssigner
            faqEntryId={entry.id}
            currentTags={entry.tags || []}
            allTags={allTags}
            onUpdate={fetchEntry}
          />
        </div>

        <p className="text-xs text-gray-400 mt-4">
          Added {new Date(entry.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
