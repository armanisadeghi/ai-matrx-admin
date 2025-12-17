import { NextRequest, NextResponse } from 'next/server';
import { countTokens } from '@/utils/token-counter';

/**
 * Token counting API endpoint
 * Uses local tiktoken with o200k_base encoding (GPT-5, GPT-4o, and newer)
 * No API calls, instant results
 */
export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required and must be a string' },
        { status: 400 }
      );
    }

    const result = countTokens(text);

    return NextResponse.json({
      tokens: result.tokens,
      characters: result.characters,
    });
  } catch (error) {
    console.error('Error counting tokens:', error);
    return NextResponse.json(
      { error: 'Failed to count tokens' },
      { status: 500 }
    );
  }
}

