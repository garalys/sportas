import type { DetectedFood } from '../types';

export interface AnalyzeResult {
  items: DetectedFood[];
  /** 'ai' when the serverless route answered, 'mock' for the local fallback. */
  source: 'ai' | 'mock';
}

const MOCK_ITEMS: DetectedFood[] = [
  { name: 'Grilled chicken breast', quantity: '150 g', calories: 248, protein: 46, carbs: 0, fat: 5 },
  { name: 'White rice', quantity: '200 g', calories: 260, protein: 5, carbs: 57, fat: 1 },
  { name: 'Mixed salad', quantity: '1 bowl', calories: 70, protein: 2, carbs: 8, fat: 4 },
];

/**
 * Sends the image to the /api/analyze-food serverless route. During local `vite
 * dev` (or before the OpenAI key is set) that route is unavailable, so we fall
 * back to a deterministic mock. The user always reviews/edits before saving.
 */
export async function analyzeFoodPhoto(imageBase64: string): Promise<AnalyzeResult> {
  try {
    const res = await fetch('/api/analyze-food', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64 }),
    });
    if (!res.ok) throw new Error(`API responded ${res.status}`);
    const data = (await res.json()) as { items?: DetectedFood[]; source?: 'ai' | 'mock' };
    if (Array.isArray(data.items) && data.items.length) {
      return { items: data.items, source: data.source ?? 'ai' };
    }
    throw new Error('Empty response');
  } catch {
    return { items: MOCK_ITEMS, source: 'mock' };
  }
}

/** Read a File into a base64 data URL for upload / API transport. */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
