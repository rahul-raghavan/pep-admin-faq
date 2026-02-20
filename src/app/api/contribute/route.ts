import { createClient, createServiceRoleClient } from '@/lib/supabase-server';
import { getAnthropicClient } from '@/lib/anthropic';
import { buildContributionMergePrompt } from '@/lib/prompts';
import { transcribeVoiceNote } from '@/lib/transcribe';
import { NextResponse } from 'next/server';
import type { ContributionMergeResult } from '@/types';

export const maxDuration = 120; // Allow up to 2 minutes for processing

export async function POST(request: Request) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { voiceNoteId, faqEntryId } = await request.json();
  if (!voiceNoteId || !faqEntryId) {
    return NextResponse.json({ error: 'voiceNoteId and faqEntryId required' }, { status: 400 });
  }

  const db = createServiceRoleClient();

  // Fetch the FAQ entry
  const { data: faqEntry, error: faqError } = await db
    .from('adminpkm_faq_entries')
    .select('id, question, answer, review_status')
    .eq('id', faqEntryId)
    .single();

  if (faqError || !faqEntry) {
    return NextResponse.json({ error: 'FAQ entry not found' }, { status: 404 });
  }

  if (faqEntry.review_status !== 'approved') {
    return NextResponse.json(
      { error: 'This FAQ is under review right now. Please try again later.' },
      { status: 400 }
    );
  }

  // Fetch the voice note
  const { data: voiceNote, error: vnError } = await db
    .from('adminpkm_voice_notes')
    .select('*')
    .eq('id', voiceNoteId)
    .single();

  if (vnError || !voiceNote) {
    return NextResponse.json({ error: 'Voice note not found' }, { status: 404 });
  }

  // Verify the voice note belongs to this user
  if (voiceNote.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Step 1: Transcribe
    const transcript = await transcribeVoiceNote(db, voiceNote);

    // Reject very short transcripts
    const wordCount = transcript.trim().split(/\s+/).length;
    if (wordCount < 10) {
      await db
        .from('adminpkm_voice_notes')
        .update({ status: 'error', error_message: 'Transcript too short (less than 10 words)' })
        .eq('id', voiceNoteId);
      return NextResponse.json(
        { error: 'The recording was too short. Please record at least a few sentences.' },
        { status: 400 }
      );
    }

    // Step 2: Fetch related FAQs in the same categories
    await db
      .from('adminpkm_voice_notes')
      .update({ status: 'processing' })
      .eq('id', voiceNoteId);

    // Get category IDs for this FAQ
    const { data: catLinks } = await db
      .from('adminpkm_faq_entry_categories')
      .select('category_id')
      .eq('faq_entry_id', faqEntryId);

    const categoryIds = (catLinks || []).map((l: { category_id: string }) => l.category_id);

    let relatedFaqs: { id: string; question: string; answer: string }[] = [];
    if (categoryIds.length > 0) {
      // Get all FAQ IDs in these categories (excluding the primary one)
      const { data: relatedLinks } = await db
        .from('adminpkm_faq_entry_categories')
        .select('faq_entry_id')
        .in('category_id', categoryIds)
        .neq('faq_entry_id', faqEntryId);

      const relatedIds = [...new Set((relatedLinks || []).map((l: { faq_entry_id: string }) => l.faq_entry_id))];

      if (relatedIds.length > 0) {
        const { data } = await db
          .from('adminpkm_faq_entries')
          .select('id, question, answer')
          .in('id', relatedIds)
          .eq('review_status', 'approved');
        relatedFaqs = data || [];
      }
    }

    // Step 3: Call Claude to merge
    const anthropic = getAnthropicClient();
    const mergePrompt = buildContributionMergePrompt(
      transcript,
      { id: faqEntry.id, question: faqEntry.question, answer: faqEntry.answer },
      relatedFaqs
    );

    const mergeResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8192,
      messages: [{ role: 'user', content: mergePrompt }],
    });

    let mergeText = mergeResponse.content[0].type === 'text'
      ? mergeResponse.content[0].text
      : '';

    // Defensive JSON parsing (strip markdown fences if needed)
    let mergeResult: ContributionMergeResult;
    try {
      mergeResult = JSON.parse(mergeText);
    } catch {
      const stripped = mergeText
        .replace(/^[\s\S]*?```(?:json)?\s*\n/i, '')
        .replace(/\n\s*```[\s\S]*$/, '')
        .trim();
      try {
        mergeResult = JSON.parse(stripped);
      } catch {
        const start = mergeText.indexOf('{');
        const end = mergeText.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
          mergeResult = JSON.parse(mergeText.slice(start, end + 1));
        } else {
          throw new Error('Failed to parse Claude merge response as JSON');
        }
      }
    }

    // Step 4: Apply results — flag primary FAQ for review
    await db
      .from('adminpkm_faq_entries')
      .update({
        review_status: 'needs_review',
        conflicting_answer: mergeResult.primary_update.merged_answer,
        conflicting_source_voice_note_id: voiceNoteId,
        conflicting_transcript_excerpt: mergeResult.primary_update.transcript_excerpt,
      })
      .eq('id', faqEntryId);

    // Flag any related FAQs that Claude identified as affected
    // Only allow IDs that we actually sent to Claude (prevent hallucinated IDs)
    const validRelatedIds = new Set(relatedFaqs.map((f) => f.id));
    for (const related of mergeResult.related_updates) {
      if (!validRelatedIds.has(related.faq_id)) {
        console.warn(`Skipping hallucinated FAQ ID from Claude: ${related.faq_id}`);
        continue;
      }
      await db
        .from('adminpkm_faq_entries')
        .update({
          review_status: 'needs_review',
          conflicting_answer: related.merged_answer,
          conflicting_source_voice_note_id: voiceNoteId,
          conflicting_transcript_excerpt: related.transcript_excerpt,
        })
        .eq('id', related.faq_id);
    }

    // Step 5: Mark voice note completed
    await db
      .from('adminpkm_voice_notes')
      .update({ status: 'completed', error_message: null })
      .eq('id', voiceNoteId);

    return NextResponse.json({
      success: true,
      summary: mergeResult.summary,
      primaryUpdated: true,
      relatedUpdated: mergeResult.related_updates.length,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    await db
      .from('adminpkm_voice_notes')
      .update({ status: 'error', error_message: errorMessage })
      .eq('id', voiceNoteId);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
