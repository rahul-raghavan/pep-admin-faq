'use client';

import { useEffect, useState } from 'react';
import type { Tag } from '@/types';

const COLOR_PRESETS = [
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#06B6D4', // cyan
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
];

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const fetchTags = async () => {
    const res = await fetch('/api/tags');
    if (res.ok) setTags(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchTags(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    });

    if (res.status === 403) {
      setForbidden(true);
      setSubmitting(false);
      return;
    }

    if (res.ok) {
      setName('');
      setColor(COLOR_PRESETS[0]);
      fetchTags();
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to create tag');
    }
    setSubmitting(false);
  };

  const handleEdit = async (id: string) => {
    const res = await fetch(`/api/tags/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, color: editColor }),
    });

    if (res.ok) {
      setEditingId(null);
      fetchTags();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to update');
    }
  };

  const handleDelete = async (id: string, tagName: string) => {
    if (!confirm(`Delete "${tagName}"? This will remove it from all FAQ entries.`)) return;

    const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchTags();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete');
    }
  };

  if (loading) return <p className="text-[#222]/50 text-center py-12">Loading...</p>;

  if (forbidden) {
    return (
      <div className="text-center py-12">
        <p className="text-[#222]/50">You don&apos;t have permission to manage tags.</p>
      </div>
    );
  }

  const ColorPalette = ({ selected, onSelect }: { selected: string; onSelect: (c: string) => void }) => (
    <div className="flex gap-1.5">
      {COLOR_PRESETS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onSelect(c)}
          className={`w-6 h-6 rounded-full cursor-pointer border-2 ${
            selected === c ? 'border-[#222] scale-110' : 'border-transparent'
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );

  return (
    <div>
      <h1 className="section-heading text-base mb-6">Tag Management</h1>

      <form onSubmit={handleCreate} className="bg-white rounded-[4px] border border-[#F0EFED] p-4 mb-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Tag name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="flex-1 px-3 py-2 border border-[#F0EFED] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#5BB8D6]/40 focus:border-[#5BB8D6]"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-[#5BB8D6] text-white rounded-[4px] text-sm uppercase tracking-wider hover:bg-[#5BB8D6]/90 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#222]/60">Color:</span>
            <ColorPalette selected={color} onSelect={setColor} />
            <span
              className="px-2 py-0.5 rounded-[4px] text-xs font-medium"
              style={{ backgroundColor: color + '20', color }}
            >
              {name || 'Preview'}
            </span>
          </div>
        </div>
        {error && <p className="text-[#D4705A] text-sm mt-2">{error}</p>}
      </form>

      <div className="bg-white rounded-[4px] border border-[#F0EFED] p-4">
        {tags.length === 0 ? (
          <p className="text-center text-sm text-[#222]/50 py-4">No tags yet. Create one above.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <div key={tag.id} className="group relative">
                {editingId === tag.id ? (
                  <div className="flex items-center gap-2 p-2 bg-[#F0EFED]/50 rounded-[4px]">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-24 px-2 py-1 border border-[#F0EFED] rounded-[4px] text-sm"
                    />
                    <ColorPalette selected={editColor} onSelect={setEditColor} />
                    <button
                      onClick={() => handleEdit(tag.id)}
                      className="text-xs text-[#5BB8D6] hover:text-[#5BB8D6]/80 cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs text-[#222]/50 hover:text-[#222]/70 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1">
                    <span
                      className="px-3 py-1 rounded-[4px] text-sm font-medium"
                      style={{ backgroundColor: tag.color + '20', color: tag.color }}
                    >
                      {tag.name}
                    </span>
                    <button
                      onClick={() => {
                        setEditingId(tag.id);
                        setEditName(tag.name);
                        setEditColor(tag.color);
                      }}
                      className="text-xs text-[#222]/30 hover:text-[#5BB8D6] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(tag.id, tag.name)}
                      className="text-xs text-[#222]/30 hover:text-[#D4705A] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
