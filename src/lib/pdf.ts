import { pdf as pdfParse } from 'pdf-parse';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Extract text from a PDF: download from storage, parse with pdf-parse, save to transcript column.
 * Skips if transcript already exists (idempotent). Returns the extracted text.
 */
export async function extractPdfText(
  db: SupabaseClient,
  voiceNote: { id: string; file_path: string; file_name: string; transcript: string | null }
): Promise<string> {
  if (voiceNote.transcript) {
    console.log('Transcript already exists, skipping PDF extraction');
    return voiceNote.transcript;
  }

  await db
    .from('adminpkm_voice_notes')
    .update({ status: 'transcribing', error_message: null })
    .eq('id', voiceNote.id);

  // Download PDF from Supabase Storage
  const { data: fileData, error: downloadError } = await db.storage
    .from('adminpkm-voice-notes')
    .download(voiceNote.file_path);

  if (downloadError || !fileData) {
    throw new Error(`Failed to download PDF: ${downloadError?.message}`);
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());
  const parsed = await pdfParse(buffer);
  const text = parsed.text.trim();

  if (text.length < 50) {
    throw new Error(
      'This PDF appears to be scanned or image-based — not enough text could be extracted. ' +
      'Please upload a text-based PDF or use a voice note instead.'
    );
  }

  await db
    .from('adminpkm_voice_notes')
    .update({ status: 'transcribed', transcript: text })
    .eq('id', voiceNote.id);

  return text;
}
