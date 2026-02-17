'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import MarkdownContent from '@/components/MarkdownContent';
import type { FaqEntry } from '@/types';

export default function FaqDetailPage() {
  const { id } = useParams();
  const [entry, setEntry] = useState<FaqEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/faq/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setEntry(data);
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
        <Link href="/kb" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to Knowledge Base
        </Link>
      </div>
    );
  }

  const category = entry.category as { name: string } | null;

  return (
    <div>
      <Link
        href="/kb"
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block"
      >
        &larr; Back to Knowledge Base
      </Link>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {category && (
          <span className="inline-block mb-3 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
            {category.name}
          </span>
        )}

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

        <p className="text-xs text-gray-400 mt-4">
          Added {new Date(entry.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
