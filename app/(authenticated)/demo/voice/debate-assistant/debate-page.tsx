'use client';

import { useState } from 'react';
import { processDebate } from '@/actions/ai-actions/groq-debate';

export default function DebateForm() {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<string[]>([]);
    const [result, setResult] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const formData = new FormData();
        formData.append('input', input);
        messages.forEach((msg) => formData.append('message', msg));

        try {
            const { response } = await processDebate(formData);
            setResult(response);
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Input here"
            />
            <button type="submit">Submit</button>
            {result && <p>Result: {result}</p>}
        </form>
    );
}
