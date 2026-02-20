'use client';

import { useState } from 'react';
import type { Tag } from '@/types';

interface TagAssignerProps {
  faqEntryId: string;
  currentTags: Tag[];
  allTags: Tag[];
  onUpdate: () => void;
}

export default function TagAssigner({ faqEntryId, currentTags, allTags, onUpdate }: TagAssignerProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentIds = new Set(currentTags.map((t) => t.id));
  const available = allTags.filter((t) => !currentIds.has(t.id));

  const handleAdd = async (tagId: string) => {
    setSaving(true);
    const newIds = [...Array.from(currentIds), tagId];
    await fetch(`/api/faq/${faqEntryId}/tags`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagIds: newIds }),
    });
    setShowDropdown(false);
    setSaving(false);
    onUpdate();
  };

  const handleRemove = async (tagId: string) => {
    setSaving(true);
    const newIds = Array.from(currentIds).filter((id) => id !== tagId);
    await fetch(`/api/faq/${faqEntryId}/tags`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagIds: newIds }),
    });
    setSaving(false);
    onUpdate();
  };

  return (
    <div>
      <p className="section-heading mb-2">Tags</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {currentTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-xs font-medium"
            style={{ backgroundColor: tag.color + '20', color: tag.color }}
          >
            {tag.name}
            <button
              onClick={() => handleRemove(tag.id)}
              disabled={saving}
              className="hover:opacity-70 cursor-pointer"
              style={{ color: tag.color }}
            >
              &times;
            </button>
          </span>
        ))}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={available.length === 0}
            className="px-2 py-0.5 text-xs text-[#5BB8D6] hover:text-[#5BB8D6]/80 cursor-pointer disabled:text-[#222]/20 disabled:cursor-default"
          >
            + Add
          </button>
          {showDropdown && available.length > 0 && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-[#F0EFED] rounded-[4px] shadow-lg z-10 min-w-[160px]">
              {available.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleAdd(tag.id)}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-[#F0EFED]/50 cursor-pointer"
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
