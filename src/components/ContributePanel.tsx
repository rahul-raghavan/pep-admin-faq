'use client';

import { useState, useCallback } from 'react';
import AudioRecorder from '@/components/AudioRecorder';

type ContributeState = 'idle' | 'recording' | 'uploading' | 'processing' | 'done' | 'error';

interface ContributePanelProps {
  faqEntryId: string;
  faqQuestion: string;
}

export default function ContributePanel({ faqEntryId, faqQuestion }: ContributePanelProps) {
  const [state, setState] = useState<ContributeState>('idle');
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState('');

  const handleRecordingComplete = useCallback(async (blob: Blob, fileName: string) => {
    setState('uploading');

    try {
      // Step 1: Upload the voice note
      const formData = new FormData();
      formData.append('file', blob, fileName);

      const uploadRes = await fetch('/api/voice-notes', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const data = await uploadRes.json();
        throw new Error(data.error || 'Upload failed');
      }

      const voiceNote = await uploadRes.json();

      // Step 2: Call the contribute API
      setState('processing');

      const contributeRes = await fetch('/api/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceNoteId: voiceNote.id, faqEntryId }),
      });

      const result = await contributeRes.json();

      if (!contributeRes.ok) {
        throw new Error(result.error || 'Contribution processing failed');
      }

      setState('done');
      setMessage(result.summary || 'Your contribution has been submitted for review.');
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : 'Something went wrong');
    }
  }, [faqEntryId]);

  if (state === 'done') {
    return (
      <div className="bg-[#5BB8D6]/10 border border-[#5BB8D6]/30 rounded-[4px] p-4">
        <p className="text-[#222] font-medium">Submitted for review!</p>
        <p className="text-[#222]/70 text-sm mt-1">{message}</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="bg-[#D4705A]/10 border border-[#D4705A]/30 rounded-[4px] p-4">
        <p className="text-[#222] font-medium">Something went wrong</p>
        <p className="text-[#D4705A] text-sm mt-1">{message}</p>
        <button
          onClick={() => { setState('idle'); setExpanded(false); setMessage(''); }}
          className="mt-2 text-sm text-[#D4705A] hover:text-[#D4705A]/80 underline cursor-pointer"
        >
          Try again
        </button>
      </div>
    );
  }

  if (state === 'uploading' || state === 'processing') {
    return (
      <div className="bg-[#5BB8D6]/10 border border-[#5BB8D6]/30 rounded-[4px] p-4">
        <p className="text-[#222] font-medium flex items-center gap-2">
          <span className="w-2 h-2 bg-[#5BB8D6] rounded-full animate-pulse" />
          {state === 'uploading' ? 'Uploading recording...' : 'Processing contribution...'}
        </p>
        <p className="text-[#222]/70 text-sm mt-1">
          {state === 'processing'
            ? 'Transcribing audio and merging with existing answer. This may take a minute.'
            : 'Uploading your recording...'}
        </p>
      </div>
    );
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="px-4 py-2 bg-[#F0EFED] text-[#222] rounded-[4px] hover:bg-[#5BB8D6]/10 transition-colors text-sm font-medium cursor-pointer"
      >
        Contribute to this answer
      </button>
    );
  }

  return (
    <div className="bg-[#F0EFED]/50 border border-[#F0EFED] rounded-[4px] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-[#222]">
          Record your contribution
        </p>
        <button
          onClick={() => setExpanded(false)}
          className="text-sm text-[#222]/40 hover:text-[#222]/60 cursor-pointer"
        >
          Cancel
        </button>
      </div>
      <p className="text-xs text-[#222]/60 mb-3">
        Record additional information or updates for: &ldquo;{faqQuestion}&rdquo;
      </p>
      <AudioRecorder onRecordingComplete={handleRecordingComplete} />
    </div>
  );
}
