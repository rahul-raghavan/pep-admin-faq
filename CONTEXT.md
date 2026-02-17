# Project Context

**What:** A voice-to-knowledge-base tool. A center manager submits voice notes (uploaded M4A or recorded in-app), which get transcribed and intelligently organized into a structured, searchable FAQ-style knowledge base covering school admin and operations.

**Users:** Small team (5-10) — the center manager submits content, other staff/managers browse and search the knowledge base.

**Starting point:** Fresh project using existing Supabase setup. Next.js + Supabase stack. Google OAuth for login (setup guide available via /google-oauth-setup skill).

**Student data:** None — purely administrative/operational knowledge. No FERPA concerns.

**MVP:** Full loop — upload or record voice notes, automatic transcription, AI-powered organization into structured FAQs, and searchable/browsable knowledge base for the team.

## Tech Choices

- **Transcription:** OpenAI Whisper API (speech-to-text for M4A voice notes)
- **AI Processing:** Anthropic Claude API (cleaning up transcripts, extracting FAQs, organizing into knowledge base categories)
- **Backend/DB:** Supabase (auth, storage, database)
- **Auth:** Google OAuth via Supabase
- **Frontend:** Next.js

## Phases

1. **Seed phase (before sharing):** Bulk-upload existing M4A files. The system transcribes and organizes them into the initial knowledge base.
2. **Live phase:** Center manager gets Google OAuth access to log in and submit new voice notes (upload or record in-app). Other staff can browse/search the knowledge base.

## Maintenance

Rahul maintains it. No IT approval needed.

## Watch Out For

- The AI organization step is the core value — turning raw transcripts into well-structured, deduplicated FAQ entries that improve over time.
- Bulk upload needs to handle multiple M4A files smoothly for the initial seed.
- Google OAuth setup needed (use /google-oauth-setup skill).
