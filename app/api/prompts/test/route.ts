// File: app/api/prompts/test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import MultiApiBaseAdapter from '@/lib/ai/adapters/MultiApiBaseAdapter';

export async function POST(request: NextRequest) {
    try {
        const { messages, model = 'gpt-4o', variables } = await request.json();

        // Replace variables in messages
        const processedMessages = messages.map((msg: any) => {
            let content = msg.content;
            
            // Replace {{variable}} with actual values
            if (variables) {
                Object.entries(variables).forEach(([key, value]) => {
                    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
                    content = content.replace(regex, String(value));
                });
            }
            
            return {
                ...msg,
                content,
            };
        });

        // Determine provider based on model
        let provider: 'openai' | 'anthropic' = 'openai';
        if (model.includes('claude')) {
            provider = 'anthropic';
        }

        const adapter = new MultiApiBaseAdapter(provider);

        // Create a streaming response
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    await adapter.streamResponse(
                        processedMessages,
                        (chunk: string) => {
                            controller.enqueue(
                                new TextEncoder().encode(`data: ${JSON.stringify({ content: chunk })}\n\n`)
                            );
                        },
                        {
                            model,
                            maxTokens: 2000,
                            temperature: 0.7,
                        }
                    );
                    
                    controller.enqueue(
                        new TextEncoder().encode(`data: ${JSON.stringify({ done: true })}\n\n`)
                    );
                    controller.close();
                } catch (error) {
                    controller.error(error);
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        console.error('Error testing prompt:', error);
        return NextResponse.json(
            { error: 'Failed to test prompt' },
            { status: 500 }
        );
    }
}

