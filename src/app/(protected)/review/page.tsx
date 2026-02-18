'use client';

import { useEffect, useState } from 'react';
import MarkdownContent from '@/components/MarkdownContent';
import type { FaqEntry } from '@/types';

export default function ReviewPage() {
  const [entries, setEntries] = useState<FaqEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [submitting, setSubmitting] = useState<string | null>(null);

  const fetchEntries = async () => {
    const res = await fetch('/api/review');
    if (res.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    if (res.ok) {
      setEntries(await res.json());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleAction = async (entryId: string, action: string, editedAnswer?: string) => {
    setSubmitting(entryId);
    const res = await fetch('/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryId, action, editedAnswer }),
    });

    if (res.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      setEditingId(null);
    }
    setSubmitting(null);
  };

  if (loading) {
    return <p className="text-gray-500 text-center py-12">Loading...</p>;
  }

  if (forbidden) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">You don't have access to this page.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Review Queue</h1>
      <p className="text-sm text-gray-500 mb-6">
        These FAQ entries have conflicting answers from different voice notes. Review and choose the correct answer.
      </p>

      {entries.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No entries need review. All clear!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {entries.map((entry) => {
            const isEditing = editingId === entry.id;
            const isSubmitting = submitting === entry.id;

            return (
              <div
                key={entry.id}
                className="bg-white rounded-lg border border-amber-200 p-6"
              >
                {entry.categories && entry.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {entry.categories.map((cat) => (
                      <span key={cat.id} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                        {cat.name}
                      </span>
                    ))}
                  </div>
                )}

                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {entry.question}
                </h2>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                      Current Answer
                    </p>
                    <div className="text-sm text-gray-700">
                      <MarkdownContent content={entry.answer} />
                    </div>
                  </div>

                  <div className="border border-amber-200 rounded-lg p-4 bg-amber-50">
                    <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-2">
                      Conflicting Answer (new)
                    </p>
                    <div className="text-sm text-gray-700">
                      <MarkdownContent content={entry.conflicting_answer || ''} />
                    </div>
                    {entry.conflicting_transcript_excerpt && (
                      <blockquote className="mt-3 text-xs text-gray-500 italic border-l-2 border-amber-200 pl-2">
                        {entry.conflicting_transcript_excerpt}
                      </blockquote>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="mb-4">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Write your corrected answer..."
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleAction(entry.id, 'edit', editText)}
                        disabled={isSubmitting || !editText.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                      >
                        Save Edited Answer
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleAction(entry.id, 'keep_original')}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50 cursor-pointer"
                    >
                      Keep Original
                    </button>
                    <button
                      onClick={() => handleAction(entry.id, 'use_new')}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
                    >
                      Use New Answer
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(entry.id);
                        setEditText(entry.answer);
                      }}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                    >
                      Edit Manually
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
