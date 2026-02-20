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
    return <p className="text-[#222]/50 text-center py-12">Loading...</p>;
  }

  if (!entry) {
    return (
      <div className="text-center py-12">
        <p className="text-[#222]/50">FAQ entry not found.</p>
        <Link href="/" className="text-[#D4705A] hover:underline mt-2 inline-block">
          Back to Knowledge Base
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/"
        className="text-sm text-[#D4705A] hover:text-[#D4705A]/80 mb-4 inline-block"
      >
        &larr; Back to Knowledge Base
      </Link>

      <div className="bg-white rounded-[4px] border border-[#F0EFED] p-8">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {entry.categories?.map((cat) => (
            <span key={cat.id} className="px-2 py-0.5 bg-[#F0EFED] text-[#222]/70 rounded-[4px] text-xs">
              {cat.name}
            </span>
          ))}
          {entry.tags?.map((tag) => (
            <span
              key={tag.id}
              className="px-2 py-0.5 rounded-[4px] text-xs font-medium"
              style={{ backgroundColor: tag.color + '20', color: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>

        <h1 className="text-xl font-bold text-[#222] mb-4">{entry.question}</h1>

        <MarkdownContent content={entry.answer} />

        {entry.source_transcript_excerpt && (
          <div className="mt-6 pt-4 border-t border-[#F0EFED]">
            <p className="section-heading mb-2">
              Source Transcript
            </p>
            <blockquote className="text-sm text-[#222]/60 italic border-l-2 border-[#5BB8D6] pl-3">
              {entry.source_transcript_excerpt}
            </blockquote>
          </div>
        )}

        {entry.review_status === 'approved' && (
          <div className="mt-6 pt-4 border-t border-[#F0EFED]">
            <ContributePanel faqEntryId={entry.id} faqQuestion={entry.question} />
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-[#F0EFED] space-y-4">
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

        <p className="text-xs text-[#222]/40 mt-4">
          Added {new Date(entry.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
