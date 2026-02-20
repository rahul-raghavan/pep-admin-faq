'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  multiple?: boolean;
}

export default function FileUploader({ onFilesSelected, multiple = true }: FileUploaderProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFilesSelected(acceptedFiles);
      }
    },
    [onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/mp4': ['.m4a'],
      'audio/x-m4a': ['.m4a'],
      'audio/mpeg': ['.mp3'],
      'audio/webm': ['.webm'],
      'audio/wav': ['.wav'],
      'application/pdf': ['.pdf'],
    },
    multiple,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-[4px] p-8 text-center cursor-pointer transition-colors ${
        isDragActive
          ? 'border-[#5BB8D6] bg-[#5BB8D6]/5'
          : 'border-[#F0EFED] hover:border-[#5BB8D6]/40'
      }`}
    >
      <input {...getInputProps()} />
      <p className="text-[#222]/70">
        {isDragActive
          ? 'Drop files here...'
          : 'Drag & drop audio or PDF files here, or click to select'}
      </p>
      <p className="text-sm text-[#222]/40 mt-1">
        Supports M4A, MP3, WebM, WAV, PDF{multiple ? ' (multiple files OK)' : ''}
      </p>
    </div>
  );
}
