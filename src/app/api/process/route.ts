import { createClient, createServiceRoleClient } from '@/lib/supabase-server';
import { getOpenAIClient } from '@/lib/openai';
import { getAnthropicClient } from '@/lib/anthropic';
import { buildFaqExtractionPrompt, buildDeduplicationPrompt } from '@/lib/prompts';
import { NextResponse } from 'next/server';
import { writeFile, unlink, readFile } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { join } from 'path';
import type { ExtractedFaq, DeduplicationResult } from '@/types';

const execFileAsync = promisify(execFile);
const WHISPER_MAX_SIZE = 24 * 1024 * 1024; // 24MB (with margin under 25MB limit)

export const maxDuration = 120; // Allow up to 2 minutes for processing

export async function POST(request: Request) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { voiceNoteId } = await request.json();
  if (!voiceNoteId) {
    return NextResponse.json({ error: 'voiceNoteId required' }, { status: 400 });
  }

  const db = createServiceRoleClient();

  // Fetch the voice note
  const { data: voiceNote, error: fetchError } = await db
    .from('adminpkm_voice_notes')
    .select('*')
    .eq('id', voiceNoteId)
    .single();

  if (fetchError || !voiceNote) {
    return NextResponse.json({ error: 'Voice note not found' }, { status: 404 });
  }

  if (!['uploaded', 'transcribed', 'error'].includes(voiceNote.status)) {
    return NextResponse.json(
      { error: `Voice note is already ${voiceNote.status}` },
      { status: 400 }
    );
  }

  try {
    // === STEP 1: Transcription (skip if already transcribed) ===
    let transcript = voiceNote.transcript as string | null;

    if (transcript) {
      console.log('Transcript already exists, skipping Whisper transcription');
    } else {
      await db
        .from('adminpkm_voice_notes')
        .update({ status: 'transcribing', error_message: null })
        .eq('id', voiceNoteId);

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

      transcript = transcription.text;

      await db
        .from('adminpkm_voice_notes')
        .update({ status: 'transcribed', transcript })
        .eq('id', voiceNoteId);
    }

    // === STEP 2: FAQ Extraction ===
    await db
      .from('adminpkm_voice_notes')
      .update({ status: 'processing' })
      .eq('id', voiceNoteId);

    // Get existing categories
    const { data: existingCategories } = await db
      .from('adminpkm_categories')
      .select('name, description')
      .order('sort_order');

    const anthropic = getAnthropicClient();
    const extractionPrompt = buildFaqExtractionPrompt(
      transcript,
      existingCategories || []
    );

    const extractionResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 16384,
      messages: [{ role: 'user', content: extractionPrompt }],
    });

    let extractionText =
      extractionResponse.content[0].type === 'text'
        ? extractionResponse.content[0].text
        : '';

    let extractionData;
    try {
      // Try parsing directly first
      extractionData = JSON.parse(extractionText);
    } catch {
      // Strip markdown fences and try again
      const stripped = extractionText
        .replace(/^[\s\S]*?```(?:json)?\s*\n/i, '')
        .replace(/\n\s*```[\s\S]*$/, '')
        .trim();
      try {
        extractionData = JSON.parse(stripped);
      } catch {
        // Last resort: find the outermost JSON object
        const start = extractionText.indexOf('{');
        const end = extractionText.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
          try {
            extractionData = JSON.parse(extractionText.slice(start, end + 1));
          } catch {
            console.error('FULL Claude response:', extractionText);
            throw new Error('Failed to parse Claude extraction response as JSON');
          }
        } else {
          console.error('FULL Claude response:', extractionText);
          throw new Error('No JSON found in Claude extraction response');
        }
      }
    }

    // Save the AI response
    await db
      .from('adminpkm_voice_notes')
      .update({ ai_response: extractionData })
      .eq('id', voiceNoteId);

    // === STEP 3: Create new categories ===
    const categoryMap: Record<string, string> = {};

    // Map existing categories
    if (existingCategories) {
      for (const cat of existingCategories) {
        const { data } = await db
          .from('adminpkm_categories')
          .select('id')
          .eq('name', cat.name)
          .single();
        if (data) categoryMap[cat.name] = data.id;
      }
    }

    // Create new categories
    if (extractionData.new_categories) {
      for (const newCat of extractionData.new_categories) {
        if (!categoryMap[newCat.name]) {
          const { data } = await db
            .from('adminpkm_categories')
            .insert({ name: newCat.name, description: newCat.description })
            .select('id')
            .single();
          if (data) categoryMap[newCat.name] = data.id;
        }
      }
    }

    // === STEP 4: Deduplicate and insert FAQs ===
    for (const faq of extractionData.faqs as ExtractedFaq[]) {
      const categoryId = categoryMap[faq.category] || null;

      // Get existing FAQs in this category for dedup
      let existingFaqs: { id: string; question: string; answer: string }[] = [];
      if (categoryId) {
        const { data } = await db
          .from('adminpkm_faq_entries')
          .select('id, question, answer')
          .eq('category_id', categoryId);
        existingFaqs = data || [];
      }

      let action: DeduplicationResult = { action: 'add', reason: 'No existing entries' };

      if (existingFaqs.length > 0) {
        const dedupPrompt = buildDeduplicationPrompt(
          { question: faq.question, answer: faq.answer },
          existingFaqs
        );

        const dedupResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1024,
          messages: [{ role: 'user', content: dedupPrompt }],
        });

        let dedupText =
          dedupResponse.content[0].type === 'text'
            ? dedupResponse.content[0].text
            : '';

        const dedupJsonMatch = dedupText.match(/\{[\s\S]*\}/);
        try {
          action = JSON.parse(dedupJsonMatch ? dedupJsonMatch[0] : dedupText);
        } catch {
          action = { action: 'add', reason: 'Failed to parse dedup response' };
        }
      }

      if (action.action === 'add') {
        await db.from('adminpkm_faq_entries').insert({
          question: faq.question,
          answer: faq.answer,
          category_id: categoryId,
          source_voice_note_id: voiceNoteId,
          source_transcript_excerpt: faq.transcript_excerpt,
        });
      } else if (action.action === 'merge' && action.merge_into_id) {
        await db
          .from('adminpkm_faq_entries')
          .update({ answer: action.merged_answer })
          .eq('id', action.merge_into_id);

        await db.from('adminpkm_faq_entries').insert({
          question: faq.question,
          answer: faq.answer,
          category_id: categoryId,
          source_voice_note_id: voiceNoteId,
          source_transcript_excerpt: faq.transcript_excerpt,
          is_merged: true,
          merged_from_id: action.merge_into_id,
        });
      } else if (action.action === 'conflict' && action.merge_into_id) {
        // Pull the existing entry from the KB and flag for review
        await db
          .from('adminpkm_faq_entries')
          .update({
            review_status: 'needs_review',
            conflicting_answer: faq.answer,
            conflicting_source_voice_note_id: voiceNoteId,
            conflicting_transcript_excerpt: faq.transcript_excerpt,
          })
          .eq('id', action.merge_into_id);
      }
      // skip: do nothing
    }

    // Mark as completed
    await db
      .from('adminpkm_voice_notes')
      .update({ status: 'completed', error_message: null })
      .eq('id', voiceNoteId);

    return NextResponse.json({ success: true, summary: extractionData.summary });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    await db
      .from('adminpkm_voice_notes')
      .update({ status: 'error', error_message: errorMessage })
      .eq('id', voiceNoteId);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
