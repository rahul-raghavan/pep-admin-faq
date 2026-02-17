'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FileUploader from '@/components/FileUploader';
import AudioRecorder from '@/components/AudioRecorder';

interface UploadResult {
  fileName: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

export default function SubmitPage() {
  const [uploads, setUploads] = useState<UploadResult[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const uploadFile = async (file: File | Blob, fileName: string) => {
    const formData = new FormData();
    formData.append('file', file, fileName);

    const res = await fetch('/api/voice-notes', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Upload failed');
    }

    return res.json();
  };

  const handleFilesSelected = async (files: File[]) => {
    setIsUploading(true);
    const results: UploadResult[] = files.map((f) => ({
      fileName: f.name,
      status: 'pending' as const,
    }));
    setUploads(results);

    for (let i = 0; i < files.length; i++) {
      setUploads((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: 'uploading' } : r))
      );

      try {
        await uploadFile(files[i], files[i].name);
        setUploads((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, status: 'done' } : r))
        );
      } catch (err) {
        setUploads((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? { ...r, status: 'error', error: (err as Error).message }
              : r
          )
        );
      }
    }

    setIsUploading(false);
  };

  const handleRecordingComplete = async (blob: Blob, fileName: string) => {
    setIsUploading(true);
    setUploads([{ fileName, status: 'uploading' }]);

    try {
      await uploadFile(blob, fileName);
      setUploads([{ fileName, status: 'done' }]);
    } catch (err) {
      setUploads([{ fileName, status: 'error', error: (err as Error).message }]);
    }

    setIsUploading(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Submit Voice Note</h1>

      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Files</h2>
          <FileUploader onFilesSelected={handleFilesSelected} multiple={true} />
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Record Audio</h2>
          <AudioRecorder onRecordingComplete={handleRecordingComplete} />
        </div>

        {uploads.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Progress</h2>
            <ul className="space-y-2">
              {uploads.map((u, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 truncate mr-4">{u.fileName}</span>
                  <span
                    className={
                      u.status === 'done'
                        ? 'text-green-600'
                        : u.status === 'error'
                        ? 'text-red-600'
                        : u.status === 'uploading'
                        ? 'text-blue-600'
                        : 'text-gray-400'
                    }
                  >
                    {u.status === 'done'
                      ? 'Uploaded'
                      : u.status === 'error'
                      ? u.error || 'Failed'
                      : u.status === 'uploading'
                      ? 'Uploading...'
                      : 'Pending'}
                  </span>
                </li>
              ))}
            </ul>

            {!isUploading && uploads.every((u) => u.status === 'done') && (
              <button
                onClick={() => router.push('/submissions')}
                className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Go to Submissions
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
