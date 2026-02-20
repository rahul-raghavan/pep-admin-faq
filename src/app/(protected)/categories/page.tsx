'use client';

import { useEffect, useState } from 'react';
import type { Category } from '@/types';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const fetchCategories = async () => {
    const res = await fetch('/api/categories');
    if (res.ok) setCategories(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });

    if (res.status === 403) {
      setForbidden(true);
      setSubmitting(false);
      return;
    }

    if (res.ok) {
      setName('');
      setDescription('');
      fetchCategories();
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to create category');
    }
    setSubmitting(false);
  };

  const handleEdit = async (id: string) => {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, description: editDescription }),
    });

    if (res.ok) {
      setEditingId(null);
      fetchCategories();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to update');
    }
  };

  const handleDelete = async (id: string, catName: string) => {
    if (!confirm(`Delete "${catName}"? This will remove it from all FAQ entries.`)) return;

    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchCategories();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete');
    }
  };

  if (loading) return <p className="text-[#222]/50 text-center py-12">Loading...</p>;

  if (forbidden) {
    return (
      <div className="text-center py-12">
        <p className="text-[#222]/50">You don&apos;t have permission to manage categories.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="section-heading text-base mb-6">Category Management</h1>

      <form onSubmit={handleCreate} className="bg-white rounded-[4px] border border-[#F0EFED] p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="flex-1 px-3 py-2 border border-[#F0EFED] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#5BB8D6]/40 focus:border-[#5BB8D6]"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
        {error && <p className="text-[#D4705A] text-sm mt-2">{error}</p>}
      </form>

      <div className="bg-white rounded-[4px] border border-[#F0EFED] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#F0EFED] bg-[#F0EFED]">
              <th className="text-left px-4 py-3 text-xs font-medium text-[#222]/60 uppercase">Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#222]/60 uppercase">Description</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-[#222]/60 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} className="border-b border-[#F0EFED] last:border-0">
                {editingId === cat.id ? (
                  <>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2 py-1 border border-[#F0EFED] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#5BB8D6]/40"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full px-2 py-1 border border-[#F0EFED] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#5BB8D6]/40"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(cat.id)}
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
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 text-sm text-[#222]">{cat.name}</td>
                    <td className="px-4 py-3 text-sm text-[#222]/60">{cat.description || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingId(cat.id);
                            setEditName(cat.name);
                            setEditDescription(cat.description || '');
                          }}
                          className="text-xs text-[#5BB8D6] hover:text-[#5BB8D6]/80 cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id, cat.name)}
                          className="text-xs text-[#D4705A] hover:text-[#D4705A]/80 cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-[#222]/50">
                  No categories yet. Create one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
