import { createClient, createServiceRoleClient } from '@/lib/supabase-server';
import { getAnthropicClient } from '@/lib/anthropic';
import { buildFaqExtractionPrompt, buildDeduplicationPrompt } from '@/lib/prompts';
import { transcribeVoiceNote } from '@/lib/transcribe';
import { NextResponse } from 'next/server';
import type { ExtractedFaq, DeduplicationResult } from '@/types';

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
    const transcript = await transcribeVoiceNote(db, voiceNote);

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

      // Get existing FAQs in this category for dedup (via join table)
      let existingFaqs: { id: string; question: string; answer: string }[] = [];
      if (categoryId) {
        const { data: links } = await db
          .from('adminpkm_faq_entry_categories')
          .select('faq_entry_id')
          .eq('category_id', categoryId);
        const faqIds = (links || []).map((l: { faq_entry_id: string }) => l.faq_entry_id);
        if (faqIds.length > 0) {
          const { data } = await db
            .from('adminpkm_faq_entries')
            .select('id, question, answer')
            .in('id', faqIds);
          existingFaqs = data || [];
        }
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
        const { data: inserted } = await db.from('adminpkm_faq_entries').insert({
          question: faq.question,
          answer: faq.answer,
          source_voice_note_id: voiceNoteId,
          source_transcript_excerpt: faq.transcript_excerpt,
        }).select('id').single();

        if (inserted && categoryId) {
          await db.from('adminpkm_faq_entry_categories').insert({
            faq_entry_id: inserted.id,
            category_id: categoryId,
          });
        }
      } else if (action.action === 'merge' && action.merge_into_id) {
        await db
          .from('adminpkm_faq_entries')
          .update({ answer: action.merged_answer })
          .eq('id', action.merge_into_id);

        const { data: inserted } = await db.from('adminpkm_faq_entries').insert({
          question: faq.question,
          answer: faq.answer,
          source_voice_note_id: voiceNoteId,
          source_transcript_excerpt: faq.transcript_excerpt,
          is_merged: true,
          merged_from_id: action.merge_into_id,
        }).select('id').single();

        if (inserted && categoryId) {
          await db.from('adminpkm_faq_entry_categories').insert({
            faq_entry_id: inserted.id,
            category_id: categoryId,
          });
        }
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
