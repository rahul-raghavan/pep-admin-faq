'use client';

const steps = [
  { key: 'uploaded', label: 'Uploaded' },
  { key: 'transcribing', label: 'Transcribing' },
  { key: 'transcribed', label: 'Transcribed' },
  { key: 'processing', label: 'Extracting FAQs' },
  { key: 'completed', label: 'Done' },
];

export default function ProcessingStatus({ status }: { status: string }) {
  if (status === 'error') {
    return <span className="text-red-600 text-sm font-medium">Error</span>;
  }

  const currentIndex = steps.findIndex((s) => s.key === status);

  return (
    <div className="flex items-center gap-1.5">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              i < currentIndex
                ? 'bg-green-500'
                : i === currentIndex
                ? 'bg-blue-500 animate-pulse'
                : 'bg-gray-200'
            }`}
          />
          {i === currentIndex && (
            <span className="text-xs text-blue-600 font-medium">{step.label}</span>
          )}
        </div>
      ))}
    </div>
  );
}
