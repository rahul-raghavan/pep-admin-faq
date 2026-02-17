'use client';

import Link from 'next/link';
import MarkdownContent from './MarkdownContent';
import type { FaqEntry } from '@/types';

export default function FaqCard({ entry }: { entry: FaqEntry }) {
  return (
    <Link
      href={`/kb/${entry.id}`}
      className="block bg-white rounded-lg border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <h3 className="text-base font-semibold text-gray-900 mb-2">{entry.question}</h3>
      <div className="text-sm text-gray-600 line-clamp-3">
        <MarkdownContent content={entry.answer} />
      </div>
      {entry.category && (
        <span className="inline-block mt-3 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
          {(entry.category as { name: string }).name}
        </span>
      )}
    </Link>
  );
}
