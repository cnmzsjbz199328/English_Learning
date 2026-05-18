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

export async function onRequestPost(context: {
  request: Request;
  env: { GEMINI_API_KEY: string };
}) {
  try {
    const { image, mimeType = "image/jpeg" } = await context.request.json() as {
      image: string;
      mimeType?: string;
    };

    if (!image) {
      return Response.json({ error: "No image provided" }, { status: 400 });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${context.env.GEMINI_API_KEY}`,
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

    return Response.json(JSON.parse(text));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to analyze image";
    console.error("Analysis error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
