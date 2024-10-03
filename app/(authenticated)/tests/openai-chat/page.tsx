'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import OpenAI from 'openai';

const OpenAITest = () => {
    const [result, setResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleTest = async () => {
        setIsLoading(true);
        setResult('');

        try {
            const openai = new OpenAI({
                apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
                dangerouslyAllowBrowser: true
            });

            const stream = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": "Hello!"},
                ],
                stream: true,
            });

            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                setResult((prev) => prev + content);
            }
        } catch (error) {
            console.error('Error:', error);
            setResult('An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4">
            <Button onClick={handleTest} disabled={isLoading}>
                {isLoading ? 'Running...' : 'Run OpenAI Test'}
            </Button>
            <div className="mt-4 p-2 border rounded">
                <h3 className="font-bold">Result:</h3>
                <p>{result || 'No result yet'}</p>
            </div>
        </div>
    );
};

export default OpenAITest;
