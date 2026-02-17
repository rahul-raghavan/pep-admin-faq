'use client';

import ReactMarkdown from 'react-markdown';

export default function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
