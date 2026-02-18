'use client';

import { memo } from 'react';
import Link from 'next/link';
import type { FaqEntry } from '@/types';

// Strip markdown syntax for a fast plain-text preview
function stripMarkdown(md: string): string {
  return md
    .replace(/[#*_~`>]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
}

export default memo(function FaqCard({ entry }: { entry: FaqEntry }) {
  return (
    <Link
      href={`/kb/${entry.id}`}
      className="block bg-white rounded-lg border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <h3 className="text-base font-semibold text-gray-900 mb-2">{entry.question}</h3>
      <p className="text-sm text-gray-600 line-clamp-3">
        {stripMarkdown(entry.answer)}
      </p>
      <div className="flex flex-wrap gap-1.5 mt-3">
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
    </Link>
  );
});
