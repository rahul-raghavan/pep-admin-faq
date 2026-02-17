export function buildFaqExtractionPrompt(
  transcript: string,
  existingCategories: { name: string; description: string | null }[]
): string {
  const categoryList =
    existingCategories.length > 0
      ? existingCategories
          .map((c) => `- ${c.name}${c.description ? `: ${c.description}` : ''}`)
          .join('\n')
      : '(none yet — you may create new categories as needed)';

  return `You are an expert at extracting structured knowledge from conversational transcripts of school administrators.

Given the following voice note transcript from a school center manager, extract FAQ-style entries. Each entry should be a clear question and a comprehensive answer that captures the operational knowledge shared.

EXISTING CATEGORIES:
${categoryList}

TRANSCRIPT:
${transcript}

INSTRUCTIONS:
1. Extract every distinct piece of operational knowledge as a Q&A pair.
2. Write questions as someone searching for this info would phrase them.
3. Write answers in clear, professional language — clean up any verbal filler, repetition, or conversational artifacts from the transcript.
4. Assign each FAQ to an existing category if one fits, or propose a new category.
5. Include a brief excerpt from the transcript that the FAQ was derived from.

Respond with valid JSON only, no markdown fences:
{
  "faqs": [
    {
      "question": "How do we handle X?",
      "answer": "Clear, complete answer...",
      "category": "Category Name",
      "transcript_excerpt": "relevant part of transcript..."
    }
  ],
  "new_categories": [
    {
      "name": "Category Name",
      "description": "Brief description of what this category covers"
    }
  ],
  "summary": "One-sentence summary of what this voice note covered"
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
