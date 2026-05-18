import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));

const ANALYZE_PROMPT = `Analyze this image which contains English text.
1. Extract every sentence and translate it into Chinese.
2. Identify complex sentences and provide detailed grammatical analysis in Chinese.
3. Extract professional or specialized vocabulary with phonetics, Chinese meanings, and English examples.

Return ONLY a valid JSON object (no markdown, no extra text):
{
  "sentences": [{"en": "English sentence", "zh": "Chinese translation"}],
  "analysis": [{"sentence": "complex sentence", "breakdown": "grammatical analysis in Chinese", "grammarPoints": ["Grammar Pattern"]}],
  "vocabulary": [{"word": "term", "phonetic": "/fəˈnɛtɪk/", "meaning": "Chinese meaning", "example": "English example"}]
}`;

app.post("/api/analyze", async (req, res) => {
  try {
    const { image, mimeType = "image/jpeg" } = req.body;

    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: ANALYZE_PROMPT },
                { inlineData: { data: image, mimeType } },
              ],
            },
          ],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errText}`);
    }

    const data = await response.json() as {
      candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No content returned from Gemini");

    res.json(JSON.parse(text));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to analyze image";
    console.error("Analysis error:", message);
    res.status(500).json({ error: message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
