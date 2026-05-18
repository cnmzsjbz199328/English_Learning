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

**AI backend (`src/App.tsx`):**
- Endpoint: `POST https://unified-ai-backend.tj15982183241.workers.dev/v1/models/large/gemini`
- Message format: `{ messages: [{ role: "user", content: string }] }`
- Response format: `{ success: boolean, content: string, model: string, provider: string, timestamp: string }`
- The prompt instructs the model to return JSON directly (no SDK-level schema enforcement)
- **Allowlist**: The Cloudflare Worker checks the request `Origin` header. In development, add `http://localhost:3000` to the Worker's allowlist. In production, add the deployed domain.

**Dev vs production server (`server.ts`):**
- In dev, Vite runs in middleware mode inside the Express server — HMR is served through the same port 3000
- In production, Express serves the pre-built `dist/` as static files
- `server.ts` contains no AI code — it only handles static file serving

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
