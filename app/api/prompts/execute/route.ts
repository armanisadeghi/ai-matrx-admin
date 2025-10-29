/**
 * API Route for executing prompts programmatically
 * 
 * Handles streaming execution of prompts with variable replacement
 */

import { NextRequest } from 'next/server';
import MultiApiBaseAdapter from '@/lib/ai/adapters/MultiApiBaseAdapter';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { messages, model = 'gpt-4o', stream = true, ...otherParams } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages format' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Determine provider based on model
    let provider: 'openai' | 'anthropic' = 'openai';
    if (model.includes('claude')) {
      provider = 'anthropic';
    }

    const adapter = new MultiApiBaseAdapter(provider);

    if (!stream) {
      // Non-streaming response (not implemented yet)
      return new Response(
        JSON.stringify({ error: 'Non-streaming mode not yet supported' }),
        {
          status: 501,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Create a streaming response
    const encoder = new TextEncoder();
    const customReadable = new ReadableStream({
      async start(controller) {
        try {
          await adapter.streamResponse(
            messages,
            (chunk: string) => {
              controller.enqueue(encoder.encode(chunk));
            },
            {
              model,
              ...otherParams
            }
          );
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          controller.enqueue(encoder.encode(`\n\n[Error: ${errorMessage}]`));
          controller.close();
        }
      },
      cancel() {
        // Handle cancellation
        console.log('Stream cancelled by client');
      }
    });

    return new Response(customReadable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in prompt execution:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

