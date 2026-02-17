export interface VoiceNote {
  id: string;
  user_id: string;
  user_email: string | null;
  file_path: string;
  file_name: string;
  duration_seconds: number | null;
  status: 'uploaded' | 'transcribing' | 'transcribed' | 'processing' | 'completed' | 'error';
  error_message: string | null;
  transcript: string | null;
  ai_response: AiResponse | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  category_id: string | null;
  category?: Category;
  source_voice_note_id: string | null;
  source_transcript_excerpt: string | null;
  is_merged: boolean;
  merged_from_id: string | null;
  review_status: 'approved' | 'needs_review';
  conflicting_answer: string | null;
  conflicting_source_voice_note_id: string | null;
  conflicting_transcript_excerpt: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiResponse {
  faqs: ExtractedFaq[];
  new_categories: { name: string; description: string }[];
  summary: string;
}

export interface ExtractedFaq {
  question: string;
  answer: string;
  category: string;
  transcript_excerpt: string;
}

export interface DeduplicationResult {
  action: 'add' | 'merge' | 'skip' | 'conflict';
  merge_into_id?: string;
  merged_answer?: string;
  reason: string;
}
