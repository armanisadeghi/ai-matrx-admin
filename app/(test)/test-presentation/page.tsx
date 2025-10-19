"use client";

import React from "react";
import EnhancedChatMarkdown from "@/components/mardown-display/chat-markdown/EnhancedChatMarkdown";
import { presentationData } from "@/components/mardown-display/blocks/presentations/example";

export default function TestPresentationPage() {
    // Create markdown content with JSON presentation
    const testContent = `# Test Presentation Detection

Here's a presentation generated from the AI:

\`\`\`json
${JSON.stringify(presentationData, null, 2)}
\`\`\`

This should automatically detect and render as an interactive slideshow!`;

    // Test streaming scenario - incomplete JSON
    const streamingContent = `# Streaming Presentation

This is a presentation being streamed:

\`\`\`json
{
  "presentation": {
    "title": "Carbon and the Molecular Diversity of Life",
    "theme": {
      "primaryColor": "#2563eb"
\`\`\`

This should show the loading visualization.`;

    return (
        <div className="container mx-auto p-8 space-y-8">
            <div className="bg-textured rounded-lg shadow-lg p-6">
                <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-100">
                    Presentation Detection Test
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Testing the automatic detection and rendering of presentation JSON blocks.
                </p>
            </div>

            <div className="bg-textured rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">
                    Complete Presentation (Should render Slideshow)
                </h2>
                <EnhancedChatMarkdown
                    content={testContent}
                    type="message"
                    role="assistant"
                    isStreamActive={false}
                />
            </div>

            <div className="bg-textured rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">
                    Streaming Presentation (Should show loading)
                </h2>
                <EnhancedChatMarkdown
                    content={streamingContent}
                    type="message"
                    role="assistant"
                    isStreamActive={true}
                />
            </div>
        </div>
    );
}

