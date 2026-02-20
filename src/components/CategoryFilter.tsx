'use client';

import { memo } from 'react';
import type { Category } from '@/types';

interface CategoryFilterProps {
  categories: Category[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export default memo(function CategoryFilter({
  categories,
  selected,
  onSelect,
}: CategoryFilterProps) {
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
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`px-3 py-1.5 rounded-[4px] text-sm font-medium transition-colors cursor-pointer ${
            selected === cat.id
              ? 'bg-[#5BB8D6] text-white'
              : 'bg-[#F0EFED] text-[#222] hover:bg-[#5BB8D6]/10'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
});
