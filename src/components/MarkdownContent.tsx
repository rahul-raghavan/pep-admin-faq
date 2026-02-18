'use client';

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';

export default memo(function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
});
