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
      className="group block bg-white rounded-[4px] border border-[#F0EFED] p-6 hover:shadow-md hover:border-[#5BB8D6]/30 transition-all duration-200"
    >
      <h3 className="text-[15px] font-semibold text-[#222] mb-2 leading-snug group-hover:text-[#5BB8D6] transition-colors">
        {entry.question}
      </h3>
      <p className="text-[13px] text-[#222]/50 line-clamp-2 leading-relaxed">
        {stripMarkdown(entry.answer)}
      </p>
      {entry.tags && entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {entry.tags.map((tag) => (
            <span
              key={tag.id}
              className="px-2 py-0.5 rounded-[4px] text-[11px] font-medium"
              style={{ backgroundColor: tag.color + '15', color: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
});
