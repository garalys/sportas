// =============================================================================
// Vercel Serverless Function — POST /api/analyze-food
// =============================================================================
// Receives a base64 food photo and returns detected foods with estimated
// calories/macros. Runs on the Vercel Edge runtime.
//
// Right now it returns MOCK data unless OPENAI_API_KEY is set, at which point it
// calls OpenAI's vision model. The frontend (src/lib/foodAnalysis.ts) also has a
// local mock fallback, so the photo flow works even before this is deployed.
//
// To enable real recognition:
//   1. Add OPENAI_API_KEY in Vercel -> Project -> Settings -> Environment Vars.
//   2. Redeploy. That's it — the code path below is already wired up.
// =============================================================================

export const config = { runtime: 'edge' };

interface DetectedFood {
  name: string;
  quantity?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

const MOCK: DetectedFood[] = [
  { name: 'Grilled chicken breast', quantity: '150 g', calories: 248, protein: 46, carbs: 0, fat: 5 },
  { name: 'White rice', quantity: '200 g', calories: 260, protein: 5, carbs: 57, fat: 1 },
  { name: 'Mixed salad', quantity: '1 bowl', calories: 70, protein: 2, carbs: 8, fat: 4 },
];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const SYSTEM_PROMPT = `You are a nutrition assistant. Identify each distinct food
in the image and estimate its portion and macros. Respond ONLY with JSON of the
shape: {"items":[{"name","quantity","calories","protein","carbs","fat"}]}.
Numbers are grams except calories (kcal). Be concise and realistic.`;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let imageBase64: string | undefined;
  try {
    ({ imageBase64 } = (await req.json()) as { imageBase64?: string });
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!imageBase64) return json({ error: 'imageBase64 is required' }, 400);

  const apiKey = process.env.OPENAI_API_KEY;

  // No key configured -> return demo data so the UI still works.
  if (!apiKey) return json({ items: MOCK, source: 'mock' });

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'What foods are in this photo?' },
              { type: 'image_url', image_url: { url: imageBase64 } },
            ],
          },
        ],
        max_tokens: 600,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      // eslint-disable-next-line no-console
      console.error('OpenAI error', res.status, detail);
      return json({ items: MOCK, source: 'mock' });
    }

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content) as { items?: DetectedFood[] };
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return json({ items: items.length ? items : MOCK, source: items.length ? 'ai' : 'mock' });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('analyze-food failed', err);
    return json({ items: MOCK, source: 'mock' });
  }
}
