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

## Environment

Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY`. The app will not call the API without it.

## Architecture

This is a single-page React app with a thin Express backend — no routing library, no state management library.

**Request flow:**
1. User uploads an image in the browser (`src/App.tsx`)
2. The image is sent as base64 to `POST /api/analyze` (`server.ts`)
3. `server.ts` calls the Gemini API (`gemini-3-flash-preview`) with a structured JSON schema response
4. The browser renders the structured result across three tabs: sentence translation, grammar analysis, and vocabulary

**Dev vs production server (`server.ts`):**
- In dev, Vite runs in middleware mode inside the Express server — HMR is served through the same port 3000
- In production, Express serves the pre-built `dist/` as static files

**Styling (`src/index.css`):**
- Uses Tailwind v4 (config via `@theme` in CSS, not `tailwind.config.js`)
- Custom design tokens are all prefixed `editorial-`: `editorial-bg`, `editorial-accent`, `editorial-text-main`, `editorial-text-muted`, `editorial-border`
- Fonts: Inter (sans) and Libre Baskerville (serif), loaded from Google Fonts

**Gemini response schema** (defined inline in `server.ts`):
```
{
  sentences: [{ en, zh }],
  analysis:  [{ sentence, breakdown, grammarPoints[] }],
  vocabulary: [{ word, phonetic, meaning, example }]
}
```
The TypeScript interfaces in `App.tsx` (`Sentence`, `Analysis`, `Vocabulary`, `AnalysisResult`) must stay in sync with this schema.
