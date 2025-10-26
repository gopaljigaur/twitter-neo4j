import { NextResponse } from 'next/server';

/**
 * GET /api/ai-status
 *
 * Returns the availability status of AI features:
 * - semanticSearch: Always available (uses local Xenova models)
 * - naturalLanguageQuery: Requires Gemini API key
 */
export async function GET() {
  const hasGeminiKey =
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' &&
    process.env.GEMINI_API_KEY.trim() !== '';

  return NextResponse.json({
    semanticSearch: {
      available: true,
      provider: 'Xenova Transformers (Local)',
    },
    naturalLanguageQuery: {
      available: hasGeminiKey,
      provider: 'Google Gemini AI',
      reason: hasGeminiKey
        ? undefined
        : 'Feature not configured',
    },
  });
}
