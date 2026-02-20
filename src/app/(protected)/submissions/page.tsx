'use client';

import { useEffect, useState, useCallback } from 'react';
import ProcessingStatus from '@/components/ProcessingStatus';
import type { VoiceNote } from '@/types';

const statusColors: Record<string, string> = {
  uploaded: 'bg-[#F0EFED] text-[#222]',
  transcribing: 'bg-[#5BB8D6]/10 text-[#5BB8D6]',
  transcribed: 'bg-[#5BB8D6]/10 text-[#5BB8D6]',
  processing: 'bg-[#5BB8D6]/10 text-[#5BB8D6]',
  completed: 'bg-[#5BB8D6]/15 text-[#222]',
  error: 'bg-[#D4705A]/10 text-[#D4705A]',
};

interface ProcessingResult {
  summary: string;
  faqsQueued: number;
}

export default function SubmissionsPage() {
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingResults, setProcessingResults] = useState<Record<string, ProcessingResult>>({});

  const fetchNotes = useCallback(async () => {
    const res = await fetch('/api/voice-notes');
    if (res.ok) {
      setNotes(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotes();
    const interval = setInterval(fetchNotes, 5000);
    return () => clearInterval(interval);
  }, [fetchNotes]);

  const handleProcess = async (noteId: string) => {
    setProcessingId(noteId);
    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceNoteId: noteId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.faqsQueued !== undefined) {
          setProcessingResults((prev) => ({
            ...prev,
            [noteId]: { summary: data.summary, faqsQueued: data.faqsQueued },
          }));
        }
      } else {
        const data = await res.json();
        alert(`Processing failed: ${data.error}`);
      }
    } catch {
      alert('Processing request failed');
    }
    setProcessingId(null);
    fetchNotes();
  };

  const handleProcessAll = async () => {
    const unprocessed = notes.filter((n) => n.status === 'uploaded');
    for (const note of unprocessed) {
      await handleProcess(note.id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[#222]/50">Loading submissions...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="section-heading text-base">Submissions</h1>
        {notes.some((n) => n.status === 'uploaded') && (
          <button
            onClick={handleProcessAll}
            disabled={processingId !== null}
            className="px-4 py-2 bg-[#5BB8D6] text-white rounded-[4px] uppercase text-sm tracking-wider hover:bg-[#5BB8D6]/90 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Process All
          </button>
        )}
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-12 text-[#222]/50">
          <p>No submissions yet.</p>
          <a href="/submit" className="text-[#D4705A] hover:underline mt-2 inline-block">
            Submit your first voice note or PDF
          </a>
        </div>
      ) : (
        <div className="bg-white rounded-[4px] border border-[#F0EFED] divide-y divide-[#F0EFED]">
          {notes.map((note) => {
            const result = processingResults[note.id];
            return (
              <div key={note.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[#222] truncate">
                        {note.file_name}
                      </p>
                      <span
                        className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium uppercase tracking-wider ${
                          note.source_type === 'pdf'
                            ? 'bg-[#D4705A]/10 text-[#D4705A]'
                            : 'bg-[#5BB8D6]/10 text-[#5BB8D6]'
                        }`}
                      >
                        {note.source_type === 'pdf' ? 'PDF' : 'Audio'}
                      </span>
                    </div>
                    <p className="text-xs text-[#222]/50 mt-0.5">
                      {note.user_email && (
                        <span className="mr-2">{note.user_email}</span>
                      )}
                      {new Date(note.created_at).toLocaleString()}
                      {note.error_message && note.status === 'error' && (
                        <span className="text-[#D4705A] ml-2">{note.error_message}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    {['transcribing', 'transcribed', 'processing'].includes(note.status) ? (
                      <ProcessingStatus status={note.status} />
                    ) : (
                      <span
                        className={`px-2 py-1 rounded-[4px] text-xs font-medium ${
                          statusColors[note.status] || 'bg-[#F0EFED] text-[#222]'
                        }`}
                      >
                        {note.status}
                      </span>
                    )}
                    {(note.status === 'uploaded' || note.status === 'error') && (
                      <button
                        onClick={() => handleProcess(note.id)}
                        disabled={processingId !== null}
                        className="px-3 py-1.5 text-sm bg-[#5BB8D6] text-white rounded-[4px] hover:bg-[#5BB8D6]/90 disabled:opacity-50 cursor-pointer"
                      >
                        {processingId === note.id ? 'Processing...' : note.status === 'error' ? 'Retry' : 'Process'}
                      </button>
                    )}
                  </div>
                </div>
                {result && (
                  <p className="text-sm text-[#5BB8D6] mt-2">
                    {result.faqsQueued} FAQ{result.faqsQueued !== 1 ? 's' : ''} sent for review
                    {result.summary && <span className="text-[#222]/50 ml-2">— {result.summary}</span>}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
