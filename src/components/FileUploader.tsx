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
    },
    multiple,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragActive
          ? 'border-blue-400 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
      }`}
    >
      <input {...getInputProps()} />
      <p className="text-gray-600">
        {isDragActive
          ? 'Drop audio files here...'
          : 'Drag & drop audio files here, or click to select'}
      </p>
      <p className="text-sm text-gray-400 mt-1">
        Supports M4A, MP3, WebM, WAV{multiple ? ' (multiple files OK)' : ''}
      </p>
    </div>
  );
}
