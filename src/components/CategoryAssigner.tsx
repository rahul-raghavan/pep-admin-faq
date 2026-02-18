'use client';

import { useState } from 'react';
import type { Category } from '@/types';

interface CategoryAssignerProps {
  faqEntryId: string;
  currentCategories: Category[];
  allCategories: Category[];
  onUpdate: () => void;
}

export default function CategoryAssigner({ faqEntryId, currentCategories, allCategories, onUpdate }: CategoryAssignerProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentIds = new Set(currentCategories.map((c) => c.id));
  const available = allCategories.filter((c) => !currentIds.has(c.id));

  const handleAdd = async (categoryId: string) => {
    setSaving(true);
    const newIds = [...Array.from(currentIds), categoryId];
    await fetch(`/api/faq/${faqEntryId}/categories`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryIds: newIds }),
    });
    setShowDropdown(false);
    setSaving(false);
    onUpdate();
  };

  const handleRemove = async (categoryId: string) => {
    setSaving(true);
    const newIds = Array.from(currentIds).filter((id) => id !== categoryId);
    await fetch(`/api/faq/${faqEntryId}/categories`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryIds: newIds }),
    });
    setSaving(false);
    onUpdate();
  };

  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Categories</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {currentCategories.map((cat) => (
          <span key={cat.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
            {cat.name}
            <button
              onClick={() => handleRemove(cat.id)}
              disabled={saving}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              &times;
            </button>
          </span>
        ))}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={available.length === 0}
            className="px-2 py-0.5 text-xs text-blue-600 hover:text-blue-800 cursor-pointer disabled:text-gray-300 disabled:cursor-default"
          >
            + Add
          </button>
          {showDropdown && available.length > 0 && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px]">
              {available.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleAdd(cat.id)}
                  className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
