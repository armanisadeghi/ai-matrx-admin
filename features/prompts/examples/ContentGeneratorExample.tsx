/**
 * Example: Content Generator with Hardcoded Variables
 * 
 * Demonstrates:
 * - Using PromptExecutionButton
 * - Hardcoded variable values
 * - Canvas output
 */

"use client";

import { PromptExecutionButton, createHardcodedMap } from '@/features/prompts';
import { Sparkles, FileText, Newspaper } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ContentGeneratorExample() {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Content Generator</CardTitle>
        <CardDescription>
          Generate different types of content with pre-configured prompts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PromptExecutionButton
            config={{
              promptId: 'blog-post-generator',
              variables: createHardcodedMap({
                topic: 'Web Development Best Practices',
                tone: 'professional',
                length: 'medium'
              }),
              output: {
                type: 'canvas',
                options: { title: 'Generated Blog Post' }
              }
            }}
            label="Generate Blog Post"
            icon={FileText}
            variant="default"
            fullWidth
          />

          <PromptExecutionButton
            config={{
              promptId: 'social-media-generator',
              variables: createHardcodedMap({
                product: 'AI Development Platform',
                platform: 'LinkedIn',
                style: 'engaging'
              }),
              output: {
                type: 'toast',
                successMessage: 'Social media post generated!'
              }
            }}
            label="Generate Social Post"
            icon={Newspaper}
            variant="outline"
            fullWidth
          />

          <PromptExecutionButton
            config={{
              promptId: 'email-template-generator',
              variables: createHardcodedMap({
                purpose: 'product launch',
                audience: 'existing customers',
                tone: 'friendly'
              }),
              output: {
                type: 'canvas'
              }
            }}
            label="Generate Email"
            icon={Sparkles}
            variant="outline"
            fullWidth
          />
        </div>
      </CardContent>
    </Card>
  );
}

