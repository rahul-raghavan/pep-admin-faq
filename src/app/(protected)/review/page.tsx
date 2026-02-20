'use client';

import { useEffect, useState } from 'react';
import MarkdownContent from '@/components/MarkdownContent';
import type { FaqEntry } from '@/types';

interface ReviewEntry extends FaqEntry {
  uploader_email: string | null;
  source_type: 'audio' | 'pdf';
}

export default function ReviewPage() {
  const [entries, setEntries] = useState<ReviewEntry[]>([]);
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
    return <p className="text-[#222]/50 text-center py-12">Loading...</p>;
  }

  if (forbidden) {
    return (
      <div className="text-center py-12">
        <p className="text-[#222]/50">You don&apos;t have access to this page.</p>
      </div>
    );
  }

  const sourceLabel = (type: 'audio' | 'pdf') =>
    type === 'pdf' ? 'PDF' : 'voice note';

  return (
    <div>
      <h1 className="section-heading text-base mb-2">Review Queue</h1>
      <p className="text-sm text-[#222]/60 mb-6">
        Review new submissions, proposed merges, and conflicting answers before they go live.
      </p>

      {entries.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-[4px] border border-[#F0EFED]">
          <p className="text-[#222]/50">No entries need review. All clear!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {entries.map((entry) => {
            const isEditing = editingId === entry.id;
            const isSubmitting = submitting === entry.id;

            // --- PENDING NEW: blue border ---
            if (entry.review_status === 'pending_new') {
              return (
                <div
                  key={entry.id}
                  className="bg-white rounded-[4px] border-2 border-[#5BB8D6]/40 p-6"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-[#5BB8D6]/10 text-[#5BB8D6] rounded-[4px] text-[10px] font-medium uppercase tracking-wider">
                      New
                    </span>
                    {entry.categories && entry.categories.length > 0 &&
                      entry.categories.map((cat) => (
                        <span key={cat.id} className="px-2 py-0.5 bg-[#F0EFED] text-[#222]/70 rounded-[4px] text-xs">
                          {cat.name}
                        </span>
                      ))
                    }
                  </div>

                  {entry.uploader_email && (
                    <p className="text-xs text-[#222]/50 mb-3">
                      Submitted by {entry.uploader_email} via {sourceLabel(entry.source_type)}
                    </p>
                  )}

                  <h2 className="text-lg font-semibold text-[#222] mb-2">
                    {entry.question}
                  </h2>

                  <div className="border border-[#F0EFED] rounded-[4px] p-4 mb-4">
                    <p className="section-heading mb-2">Proposed Answer</p>
                    <div className="text-sm text-[#222]/80">
                      <MarkdownContent content={entry.answer} />
                    </div>
                    {entry.source_transcript_excerpt && (
                      <blockquote className="mt-3 text-xs text-[#222]/50 italic border-l-2 border-[#5BB8D6]/30 pl-2">
                        {entry.source_transcript_excerpt}
                      </blockquote>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="mb-4">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2 border border-[#F0EFED] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#5BB8D6]/40 focus:border-[#5BB8D6]"
                        placeholder="Edit the answer before approving..."
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleAction(entry.id, 'edit', editText)}
                          disabled={isSubmitting || !editText.trim()}
                          className="px-4 py-2 bg-[#5BB8D6] text-white rounded-[4px] text-sm uppercase tracking-wider hover:bg-[#5BB8D6]/90 disabled:opacity-50 cursor-pointer"
                        >
                          Save & Approve
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-4 py-2 bg-[#F0EFED] text-[#222] rounded-[4px] text-sm hover:bg-[#F0EFED]/80 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleAction(entry.id, 'approve_new')}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-[#5BB8D6] text-white rounded-[4px] text-sm uppercase tracking-wider hover:bg-[#5BB8D6]/90 disabled:opacity-50 cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(entry.id, 'reject_new')}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-[#D4705A] text-white rounded-[4px] text-sm uppercase tracking-wider hover:bg-[#D4705A]/90 disabled:opacity-50 cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(entry.id);
                          setEditText(entry.answer);
                        }}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-white border border-[#F0EFED] text-[#222] rounded-[4px] text-sm hover:bg-[#F0EFED]/50 disabled:opacity-50 cursor-pointer"
                      >
                        Edit then Approve
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            // --- PENDING MERGE: amber border ---
            if (entry.review_status === 'pending_merge') {
              return (
                <div
                  key={entry.id}
                  className="bg-white rounded-[4px] border-2 border-amber-400/40 p-6"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-[4px] text-[10px] font-medium uppercase tracking-wider">
                      Merge
                    </span>
                    {entry.categories && entry.categories.length > 0 &&
                      entry.categories.map((cat) => (
                        <span key={cat.id} className="px-2 py-0.5 bg-[#F0EFED] text-[#222]/70 rounded-[4px] text-xs">
                          {cat.name}
                        </span>
                      ))
                    }
                  </div>

                  {entry.uploader_email && (
                    <p className="text-xs text-[#222]/50 mb-3">
                      Proposed by {entry.uploader_email} via {sourceLabel(entry.source_type)}
                    </p>
                  )}

                  <h2 className="text-lg font-semibold text-[#222] mb-4">
                    {entry.question}
                  </h2>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="border border-[#F0EFED] rounded-[4px] p-4">
                      <p className="section-heading mb-2">Current Answer</p>
                      <div className="text-sm text-[#222]/80">
                        <MarkdownContent content={entry.answer} />
                      </div>
                    </div>

                    <div className="border border-amber-400/30 rounded-[4px] p-4 bg-amber-50/50">
                      <p className="text-xs font-medium text-amber-700 uppercase tracking-[0.15em] mb-2">
                        AI-Proposed Merged Answer
                      </p>
                      <div className="text-sm text-[#222]/80">
                        <MarkdownContent content={entry.conflicting_answer || ''} />
                      </div>
                      {entry.conflicting_transcript_excerpt && (
                        <blockquote className="mt-3 text-xs text-[#222]/50 italic border-l-2 border-amber-400/30 pl-2">
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
                        className="w-full px-3 py-2 border border-[#F0EFED] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#5BB8D6]/40 focus:border-[#5BB8D6]"
                        placeholder="Write your own merged answer..."
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleAction(entry.id, 'edit', editText)}
                          disabled={isSubmitting || !editText.trim()}
                          className="px-4 py-2 bg-[#5BB8D6] text-white rounded-[4px] text-sm uppercase tracking-wider hover:bg-[#5BB8D6]/90 disabled:opacity-50 cursor-pointer"
                        >
                          Save Edited Answer
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-4 py-2 bg-[#F0EFED] text-[#222] rounded-[4px] text-sm hover:bg-[#F0EFED]/80 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleAction(entry.id, 'approve_merge')}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-amber-500 text-white rounded-[4px] text-sm uppercase tracking-wider hover:bg-amber-600 disabled:opacity-50 cursor-pointer"
                      >
                        Approve Merge
                      </button>
                      <button
                        onClick={() => handleAction(entry.id, 'reject_merge')}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-[#222] text-white rounded-[4px] text-sm uppercase tracking-wider hover:bg-[#222]/90 disabled:opacity-50 cursor-pointer"
                      >
                        Keep Original
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(entry.id);
                          setEditText(entry.conflicting_answer || entry.answer);
                        }}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-white border border-[#F0EFED] text-[#222] rounded-[4px] text-sm hover:bg-[#F0EFED]/50 disabled:opacity-50 cursor-pointer"
                      >
                        Edit Manually
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            // --- NEEDS REVIEW (conflict): coral border (existing behavior + attribution) ---
            return (
              <div
                key={entry.id}
                className="bg-white rounded-[4px] border-2 border-[#D4705A]/30 p-6"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-[#D4705A]/10 text-[#D4705A] rounded-[4px] text-[10px] font-medium uppercase tracking-wider">
                    Conflict
                  </span>
                  {entry.categories && entry.categories.length > 0 &&
                    entry.categories.map((cat) => (
                      <span key={cat.id} className="px-2 py-0.5 bg-[#F0EFED] text-[#222]/70 rounded-[4px] text-xs">
                        {cat.name}
                      </span>
                    ))
                  }
                </div>

                {entry.uploader_email && (
                  <p className="text-xs text-[#222]/50 mb-3">
                    Submitted by {entry.uploader_email} via {sourceLabel(entry.source_type)}
                  </p>
                )}

                <h2 className="text-lg font-semibold text-[#222] mb-4">
                  {entry.question}
                </h2>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="border border-[#F0EFED] rounded-[4px] p-4">
                    <p className="section-heading mb-2">
                      Current Answer
                    </p>
                    <div className="text-sm text-[#222]/80">
                      <MarkdownContent content={entry.answer} />
                    </div>
                  </div>

                  <div className="border border-[#D4705A]/30 rounded-[4px] p-4 bg-[#D4705A]/5">
                    <p className="text-xs font-medium text-[#D4705A] uppercase tracking-[0.15em] mb-2">
                      Conflicting Answer (new)
                    </p>
                    <div className="text-sm text-[#222]/80">
                      <MarkdownContent content={entry.conflicting_answer || ''} />
                    </div>
                    {entry.conflicting_transcript_excerpt && (
                      <blockquote className="mt-3 text-xs text-[#222]/50 italic border-l-2 border-[#D4705A]/30 pl-2">
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
                      className="w-full px-3 py-2 border border-[#F0EFED] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#5BB8D6]/40 focus:border-[#5BB8D6]"
                      placeholder="Write your corrected answer..."
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleAction(entry.id, 'edit', editText)}
                        disabled={isSubmitting || !editText.trim()}
                        className="px-4 py-2 bg-[#5BB8D6] text-white rounded-[4px] text-sm uppercase tracking-wider hover:bg-[#5BB8D6]/90 disabled:opacity-50 cursor-pointer"
                      >
                        Save Edited Answer
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 bg-[#F0EFED] text-[#222] rounded-[4px] text-sm hover:bg-[#F0EFED]/80 cursor-pointer"
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
                      className="px-4 py-2 bg-[#222] text-white rounded-[4px] text-sm uppercase tracking-wider hover:bg-[#222]/90 disabled:opacity-50 cursor-pointer"
                    >
                      Keep Original
                    </button>
                    <button
                      onClick={() => handleAction(entry.id, 'use_new')}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-[#D4705A] text-white rounded-[4px] text-sm uppercase tracking-wider hover:bg-[#D4705A]/90 disabled:opacity-50 cursor-pointer"
                    >
                      Use New Answer
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(entry.id);
                        setEditText(entry.answer);
                      }}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-white border border-[#F0EFED] text-[#222] rounded-[4px] text-sm hover:bg-[#F0EFED]/50 disabled:opacity-50 cursor-pointer"
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
