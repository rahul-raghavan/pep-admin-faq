export function buildFaqExtractionPrompt(
  transcript: string,
  existingCategories: { name: string; description: string | null }[],
  sourceType: 'audio' | 'pdf' = 'audio'
): string {
  const sourceLabel = sourceType === 'pdf' ? 'document' : 'voice note transcript';
  const categoryList =
    existingCategories.length > 0
      ? existingCategories
          .map((c) => `- ${c.name}${c.description ? `: ${c.description}` : ''}`)
          .join('\n')
      : '(none yet — you may create new categories as needed)';

  return `You are an expert at extracting structured knowledge from conversational transcripts of school administrators.

Given the following ${sourceLabel} from a school center manager, extract FAQ-style entries. Each entry should be a clear question and a comprehensive answer that captures the operational knowledge shared.

EXISTING CATEGORIES:
${categoryList}

SOURCE TEXT:
${transcript}

INSTRUCTIONS:
1. Extract every distinct piece of operational knowledge as a Q&A pair.
2. Write questions as someone searching for this info would phrase them.
3. Write answers in clear, professional language — clean up any verbal filler, repetition, or conversational artifacts from the transcript.
4. Assign each FAQ to an existing category if one fits, or propose a new category.
5. Include a brief excerpt from the source text that the FAQ was derived from.

Respond with valid JSON only, no markdown fences:
{
  "faqs": [
    {
      "question": "How do we handle X?",
      "answer": "Clear, complete answer...",
      "category": "Category Name",
      "transcript_excerpt": "relevant part of source text..."
    }
  ],
  "new_categories": [
    {
      "name": "Category Name",
      "description": "Brief description of what this category covers"
    }
  ],
  "summary": "One-sentence summary of what this ${sourceLabel} covered"
}`;
}

export function buildContributionMergePrompt(
  transcript: string,
  primaryFaq: { id: string; question: string; answer: string },
  relatedFaqs: { id: string; question: string; answer: string }[]
): string {
  const relatedList = relatedFaqs.length > 0
    ? relatedFaqs
        .map((f) => `[ID: ${f.id}]\nQ: ${f.question}\nA: ${f.answer}`)
        .join('\n\n')
    : '(none)';

  return `You are updating a school admin knowledge base based on a new voice contribution.

A user has recorded a voice note to contribute additional information to an existing FAQ entry. Your job is to merge the new information from the transcript into the existing answer, and check whether any related FAQs in the same categories are also affected.

PRIMARY FAQ BEING UPDATED:
[ID: ${primaryFaq.id}]
Q: ${primaryFaq.question}
A: ${primaryFaq.answer}

OTHER FAQs IN THE SAME CATEGORIES:
${relatedList}

VOICE NOTE TRANSCRIPT:
${transcript}

INSTRUCTIONS:
1. Merge the new information from the transcript into the primary FAQ's answer. Keep the existing structure and language, but incorporate any new details, corrections, or updates.
2. Check if any of the related FAQs are also affected by the transcript (e.g. the transcript mentions something that updates or contradicts a related FAQ). Only include related FAQs that are genuinely affected — don't force updates.
3. For each update, include a brief excerpt from the transcript that supports the change.

Respond with valid JSON only, no markdown fences:
{
  "primary_update": {
    "merged_answer": "the full updated answer for the primary FAQ",
    "transcript_excerpt": "relevant part of transcript",
    "change_summary": "one sentence describing what changed"
  },
  "related_updates": [
    {
      "faq_id": "id of affected related FAQ",
      "merged_answer": "the full updated answer",
      "transcript_excerpt": "relevant part of transcript",
      "change_summary": "one sentence describing what changed"
    }
  ],
  "summary": "one sentence summary of the contribution"
}`;
}

export function buildDeduplicationPrompt(
  newFaq: { question: string; answer: string },
  existingFaqs: { id: string; question: string; answer: string }[]
): string {
  const existingList = existingFaqs
    .map(
      (f) =>
        `[ID: ${f.id}]\nQ: ${f.question}\nA: ${f.answer}`
    )
    .join('\n\n');

  return `You are deduplicating FAQ entries for a school admin knowledge base.

NEW ENTRY:
Q: ${newFaq.question}
A: ${newFaq.answer}

EXISTING ENTRIES IN THE SAME CATEGORY:
${existingList || '(none)'}

Decide one of:
- "add": This is genuinely new information not covered by any existing entry.
- "merge": This overlaps with an existing entry and the new info is COMPATIBLE (adds detail, doesn't contradict). Merge the new info into the existing answer.
- "skip": This is a duplicate with no new information.
- "conflict": The new answer SUBSTANTIALLY CONTRADICTS an existing entry — different advice, different procedures, or a meaningfully different position on the same question. Small nuances or additional context are fine (use "merge" for those). Only use "conflict" when the answers genuinely disagree.

If merging, provide the combined answer that includes all information from both entries.
If conflict, provide the ID of the existing entry it conflicts with.

Respond with valid JSON only, no markdown fences:
{
  "action": "add" | "merge" | "skip" | "conflict",
  "merge_into_id": "id of existing entry (only if merge or conflict)",
  "merged_answer": "combined answer (only if merge)",
  "reason": "brief explanation of your decision"
}`;
}
