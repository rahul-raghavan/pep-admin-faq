import { createClient, createServiceRoleClient } from '@/lib/supabase-server';
import { isSuperAdmin } from '@/lib/auth';
import { getAnthropicClient } from '@/lib/anthropic';
import { buildFaqExtractionPrompt, buildDeduplicationPrompt } from '@/lib/prompts';
import { transcribeVoiceNote } from '@/lib/transcribe';
import { extractPdfText } from '@/lib/pdf';
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

  // Verify ownership: only the uploader or an admin can process
  const isAdmin = user.email ? await isSuperAdmin(user.email) : false;
  if (voiceNote.user_id !== user.id && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!['uploaded', 'transcribed', 'error'].includes(voiceNote.status)) {
    return NextResponse.json(
      { error: `Voice note is already ${voiceNote.status}` },
      { status: 400 }
    );
  }

  // Atomically claim this note for processing (prevents duplicate processing)
  const { data: claimed, error: claimError } = await db
    .from('adminpkm_voice_notes')
    .update({ status: 'transcribing', error_message: null })
    .eq('id', voiceNoteId)
    .in('status', ['uploaded', 'transcribed', 'error'])
    .select('id')
    .single();

  if (claimError || !claimed) {
    return NextResponse.json(
      { error: 'This note is already being processed' },
      { status: 409 }
    );
  }

  try {
    // === STEP 1: Transcription / PDF extraction (skip if already done) ===
    const transcript = voiceNote.source_type === 'pdf'
      ? await extractPdfText(db, voiceNote)
      : await transcribeVoiceNote(db, voiceNote);

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
      existingCategories || [],
      voiceNote.source_type || 'audio'
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

    // Map existing categories (single query instead of N+1)
    const { data: allCategories } = await db
      .from('adminpkm_categories')
      .select('id, name');
    for (const cat of allCategories || []) {
      categoryMap[cat.name] = cat.id;
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

    // === STEP 4: Deduplicate and insert FAQs (all go to review queue) ===
    let faqsQueued = 0;

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

        const dedupText =
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
        // Insert as pending_new — requires admin approval
        const { data: inserted } = await db.from('adminpkm_faq_entries').insert({
          question: faq.question,
          answer: faq.answer,
          source_voice_note_id: voiceNoteId,
          source_transcript_excerpt: faq.transcript_excerpt,
          review_status: 'pending_new',
        }).select('id').single();

        if (inserted && categoryId) {
          await db.from('adminpkm_faq_entry_categories').insert({
            faq_entry_id: inserted.id,
            category_id: categoryId,
          });
        }
        faqsQueued++;
      } else if (action.action === 'merge' && action.merge_into_id) {
        // Flag existing entry for merge review instead of auto-merging
        await db
          .from('adminpkm_faq_entries')
          .update({
            review_status: 'pending_merge',
            conflicting_answer: action.merged_answer,
            conflicting_source_voice_note_id: voiceNoteId,
            conflicting_transcript_excerpt: faq.transcript_excerpt,
          })
          .eq('id', action.merge_into_id);
        faqsQueued++;
      } else if (action.action === 'conflict' && action.merge_into_id) {
        // Flag for conflict review (unchanged behavior)
        await db
          .from('adminpkm_faq_entries')
          .update({
            review_status: 'needs_review',
            conflicting_answer: faq.answer,
            conflicting_source_voice_note_id: voiceNoteId,
            conflicting_transcript_excerpt: faq.transcript_excerpt,
          })
          .eq('id', action.merge_into_id);
        faqsQueued++;
      }
      // skip: do nothing
    }

    // Mark as completed
    await db
      .from('adminpkm_voice_notes')
      .update({ status: 'completed', error_message: null })
      .eq('id', voiceNoteId);

    return NextResponse.json({ success: true, summary: extractionData.summary, faqsQueued });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    await db
      .from('adminpkm_voice_notes')
      .update({ status: 'error', error_message: errorMessage })
      .eq('id', voiceNoteId);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
