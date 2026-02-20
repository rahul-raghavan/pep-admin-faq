'use client';

import { memo } from 'react';
import type { Tag } from '@/types';

interface TagFilterProps {
  tags: Tag[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export default memo(function TagFilter({ tags, selected, onSelect }: TagFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(null)}
        className={`px-3 py-1.5 rounded-[4px] text-sm font-medium transition-colors cursor-pointer ${
          selected === null
            ? 'bg-[#5BB8D6] text-white'
            : 'bg-[#F0EFED] text-[#222] hover:bg-[#5BB8D6]/10'
        }`}
      >
        All Tags
      </button>
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => onSelect(tag.id)}
          className="px-3 py-1.5 rounded-[4px] text-sm font-medium transition-colors cursor-pointer"
          style={
            selected === tag.id
              ? { backgroundColor: tag.color, color: 'white' }
              : { backgroundColor: tag.color + '20', color: tag.color }
          }
        >
          {tag.name}
        </button>
      ))}
    </div>
  );
});
