# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (runs Express + Vite dev server together on port 3000)
npm run dev

# Type-check (no emit — this is the lint step)
npm run lint

# Production build
npm run build

# Run production build
npm start
```

There is no test suite. `npm run lint` (`tsc --noEmit`) is the only automated check.

## Architecture

This is a single-page React app with a thin Express backend. The AI call goes directly from the browser to a Cloudflare Worker — no AI code lives in the Express backend.

**Request flow:**
1. User uploads an image in the browser (`src/App.tsx`)
2. `App.tsx` builds a prompt embedding the image as a base64 data URL and POSTs directly to the unified AI backend
3. The AI backend returns `{ success: boolean, content: string }` where `content` is the model's text output
4. `App.tsx` strips any markdown code fences from `content` and `JSON.parse`s the result
5. The browser renders the structured result across three tabs: sentence translation, grammar analysis, and vocabulary

**AI backend:**
- In development: `POST /api/analyze` is handled by `server.ts`, which calls the Gemini REST API directly using `GEMINI_API_KEY` from `.env.local`
- In production (Cloudflare Pages): `POST /api/analyze` is handled by `functions/api/analyze.ts` (a Pages Function), which calls the same Gemini REST API using `GEMINI_API_KEY` set as a Pages secret
- Both call `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
- The prompt and JSON response schema are duplicated between `server.ts` and `functions/api/analyze.ts` — keep them in sync

**Dev vs production server (`server.ts`):**
- In dev, Vite runs in middleware mode inside the Express server — HMR is served through the same port 3000
- In production, Cloudflare Pages serves the static `dist/` files; `server.ts` is not used
- `server.ts` loads `GEMINI_API_KEY` from `.env.local` via dotenv

**Styling (`src/index.css`):**
- Uses Tailwind v4 (config via `@theme` in CSS, not `tailwind.config.js`)
- Custom design tokens are all prefixed `editorial-`: `editorial-bg`, `editorial-accent`, `editorial-text-main`, `editorial-text-muted`, `editorial-border`
- Fonts: Inter (sans) and Libre Baskerville (serif), loaded from Google Fonts

**Gemini response schema** (enforced via prompt in `buildAnalysisPrompt` in `App.tsx`):
```
{
  sentences: [{ en, zh }],
  analysis:  [{ sentence, breakdown, grammarPoints[] }],
  vocabulary: [{ word, phonetic, meaning, example }]
}
```
The TypeScript interfaces in `App.tsx` (`Sentence`, `Analysis`, `Vocabulary`, `AnalysisResult`) must stay in sync with this schema.
