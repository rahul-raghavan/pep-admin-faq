'use client';

import { useState, useRef, useCallback } from 'react';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob, fileName: string) => void;
}

export default function AudioRecorder({ onRecordingComplete }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
        onRecordingComplete(blob, `recording-${timestamp}.webm`);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      alert('Could not access microphone. Please allow microphone access.');
    }
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-4">
      {isRecording ? (
        <>
          <button
            onClick={stopRecording}
            className="px-4 py-2 bg-[#D4705A] text-white rounded-[4px] uppercase text-sm tracking-wider hover:bg-[#D4705A]/90 transition-colors cursor-pointer"
          >
            Stop Recording
          </button>
          <span className="text-sm text-[#D4705A] font-medium flex items-center gap-2">
            <span className="w-2 h-2 bg-[#D4705A] rounded-full animate-pulse" />
            Recording {formatDuration(duration)}
          </span>
        </>
      ) : (
        <button
          onClick={startRecording}
          className="px-4 py-2 bg-[#5BB8D6] text-white rounded-[4px] uppercase text-sm tracking-wider hover:bg-[#5BB8D6]/90 transition-colors cursor-pointer"
        >
          Record Audio
        </button>
      )}
    </div>
  );
}
