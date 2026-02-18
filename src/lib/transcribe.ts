import { getOpenAIClient } from '@/lib/openai';
import { writeFile, unlink, readFile } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { join } from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';

const execFileAsync = promisify(execFile);
const WHISPER_MAX_SIZE = 24 * 1024 * 1024; // 24MB (with margin under 25MB limit)

/**
 * Transcribe a voice note: download from storage, compress if needed, call Whisper, save transcript.
 * Skips if transcript already exists. Returns the transcript text.
 */
export async function transcribeVoiceNote(
  db: SupabaseClient,
  voiceNote: { id: string; file_path: string; file_name: string; transcript: string | null }
): Promise<string> {
  // Skip if already transcribed
  if (voiceNote.transcript) {
    console.log('Transcript already exists, skipping Whisper transcription');
    return voiceNote.transcript;
  }

  await db
    .from('adminpkm_voice_notes')
    .update({ status: 'transcribing', error_message: null })
    .eq('id', voiceNote.id);

  // Download audio from Supabase Storage
  const { data: fileData, error: downloadError } = await db.storage
    .from('adminpkm-voice-notes')
    .download(voiceNote.file_path);

  if (downloadError || !fileData) {
    throw new Error(`Failed to download audio: ${downloadError?.message}`);
  }

  // Compress if file is too large for Whisper (25MB limit)
  const openai = getOpenAIClient();
  let audioFile: File;

  if (fileData.size > WHISPER_MAX_SIZE) {
    const tempInput = join(tmpdir(), `adminpkm-${Date.now()}-input`);
    const tempOutput = join(tmpdir(), `adminpkm-${Date.now()}-output.mp3`);

    try {
      const buffer = Buffer.from(await fileData.arrayBuffer());
      await writeFile(tempInput, buffer);

      // Compress to mono MP3 at 64kbps (plenty for speech)
      await execFileAsync('ffmpeg', [
        '-i', tempInput,
        '-ac', '1',           // mono
        '-ab', '64k',         // 64kbps bitrate
        '-ar', '16000',       // 16kHz sample rate (optimal for Whisper)
        '-y',                 // overwrite
        tempOutput,
      ]);

      const compressedData = await readFile(tempOutput);
      audioFile = new File([compressedData], 'audio.mp3', { type: 'audio/mpeg' });

      await unlink(tempInput).catch(() => {});
      await unlink(tempOutput).catch(() => {});
    } catch (compressError) {
      await unlink(tempInput).catch(() => {});
      await unlink(tempOutput).catch(() => {});
      throw new Error(`Audio compression failed: ${compressError instanceof Error ? compressError.message : 'unknown'}`);
    }
  } else {
    audioFile = new File([fileData], voiceNote.file_name, { type: 'audio/mp4' });
  }

  const transcription = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file: audioFile,
  });

  const transcript = transcription.text;

  await db
    .from('adminpkm_voice_notes')
    .update({ status: 'transcribed', transcript })
    .eq('id', voiceNote.id);

  return transcript;
}
