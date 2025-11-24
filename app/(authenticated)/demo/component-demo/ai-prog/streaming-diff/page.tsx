'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, RotateCcw, Zap } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MarkdownStream from '@/components/Markdown';

// Sample SEARCH/REPLACE content that would come from AI
const SAMPLE_SEARCH_REPLACE = `Here are the edits to convert the button to green and add the React import:

\`\`\`diff
SEARCH:
<<<
import { useState } from 'react';
>>>

REPLACE:
<<<
import React, { useState } from 'react';
>>>
\`\`\`

**Explanation**: Added the React import alongside the existing useState import.

---

\`\`\`diff
SEARCH:
<<<
      <button 
        onClick={() => setCount(count + 1)}
        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition-colors"
      >
        Increment
      </button>
>>>

REPLACE:
<<<
      <button 
        onClick={() => setCount(count + 1)}
        className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded transition-colors"
      >
        Increment
      </button>
>>>
\`\`\`

**Explanation**: Changed the button color from blue to green by updating \`bg-blue-500\` to \`bg-green-500\` and \`hover:bg-blue-600\` to \`hover:bg-green-600\`.`;

// Sample with multiple edits
const SAMPLE_MULTIPLE_EDITS = `I'll refactor the component to use TypeScript interfaces:

\`\`\`diff
SEARCH:
<<<
function UserProfile(props) {
  const { name, email, age } = props;
>>>

REPLACE:
<<<
interface UserProfileProps {
  name: string;
  email: string;
  age: number;
}

function UserProfile({ name, email, age }: UserProfileProps) {
>>>
\`\`\`

\`\`\`diff
SEARCH:
<<<
  return (
    <div className="profile">
      <h1>{name}</h1>
      <p>{email}</p>
    </div>
  );
>>>

REPLACE:
<<<
  return (
    <div className="profile">
      <h1 className="text-2xl font-bold">{name}</h1>
      <p className="text-sm text-gray-600">{email}</p>
      <span className="text-xs">Age: {age}</span>
    </div>
  );
>>>
\`\`\``;

const SAMPLES = {
  'basic': { 
    name: 'Basic SEARCH/REPLACE', 
    content: SAMPLE_SEARCH_REPLACE,
    description: 'Two simple edits with explanations'
  },
  'multiple': { 
    name: 'Multiple Edits', 
    content: SAMPLE_MULTIPLE_EDITS,
    description: 'Multiple refactoring edits'
  },
};

export default function StreamingDiffDemoPage() {
  const [selectedSample, setSelectedSample] = useState<keyof typeof SAMPLES>('basic');
  const [displayedContent, setDisplayedContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamSpeed, setStreamSpeed] = useState<'slow' | 'medium' | 'fast' | 'instant'>('medium');

  const currentSample = SAMPLES[selectedSample];

  // Simulate streaming
  const simulateStreaming = () => {
    const content = currentSample.content;
    setDisplayedContent('');
    setIsStreaming(true);

    const speedMap = {
      slow: 50,
      medium: 20,
      fast: 5,
      instant: 0,
    };

    const delay = speedMap[streamSpeed];

    if (delay === 0) {
      // Instant
      setDisplayedContent(content);
      setIsStreaming(false);
      return;
    }

    let index = 0;
    const intervalId = setInterval(() => {
      if (index < content.length) {
        // Stream in chunks for more realistic behavior
        const chunkSize = streamSpeed === 'slow' ? 1 : streamSpeed === 'medium' ? 3 : 10;
        setDisplayedContent(content.substring(0, index + chunkSize));
        index += chunkSize;
      } else {
        clearInterval(intervalId);
        setIsStreaming(false);
      }
    }, delay);
  };

  const handleReset = () => {
    setDisplayedContent('');
    setIsStreaming(false);
  };

  const handleInstantShow = () => {
    setDisplayedContent(currentSample.content);
    setIsStreaming(false);
  };

  // Reset when changing samples
  useEffect(() => {
    handleReset();
  }, [selectedSample]);

  return (
    <div className="h-[calc(100dvh-var(--header-height))] flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Zap className="w-8 h-8 text-primary" />
              Streaming Diff Block Demo
            </h1>
            <p className="text-muted-foreground mt-2">
              Demonstrates the new streaming diff component with SEARCH/REPLACE blocks
            </p>
          </div>

          {/* Controls */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Controls</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Sample Selection */}
              <div className="space-y-2">
                <Label>Sample</Label>
                <Select value={selectedSample} onValueChange={(v) => setSelectedSample(v as keyof typeof SAMPLES)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SAMPLES).map(([key, sample]) => (
                      <SelectItem key={key} value={key}>
                        {sample.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{currentSample.description}</p>
              </div>

              {/* Speed Selection */}
              <div className="space-y-2">
                <Label>Streaming Speed</Label>
                <Select value={streamSpeed} onValueChange={(v) => setStreamSpeed(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slow">Slow (50ms/chunk)</SelectItem>
                    <SelectItem value="medium">Medium (20ms/chunk)</SelectItem>
                    <SelectItem value="fast">Fast (5ms/chunk)</SelectItem>
                    <SelectItem value="instant">Instant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <Label>Actions</Label>
                <div className="flex gap-2">
                  <Button onClick={simulateStreaming} disabled={isStreaming} className="flex-1">
                    <Play className="w-4 h-4 mr-2" />
                    Stream
                  </Button>
                  <Button onClick={handleInstantShow} disabled={isStreaming} variant="secondary" className="flex-1">
                    <Zap className="w-4 h-4 mr-2" />
                    Instant
                  </Button>
                  <Button onClick={handleReset} variant="outline" size="icon">
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Preview */}
          <div className="space-y-3">
            <Tabs defaultValue="rendered" className="w-full">
              <TabsList>
                <TabsTrigger value="rendered">Rendered</TabsTrigger>
                <TabsTrigger value="raw">Raw Markdown</TabsTrigger>
              </TabsList>

              <TabsContent value="rendered" className="mt-4">
                <Card className="p-6">
                  {displayedContent ? (
                    <MarkdownStream
                      content={displayedContent}
                      type="message"
                      role="assistant"
                      isStreamActive={isStreaming}
                      hideCopyButton={false}
                      allowFullScreenEditor={false}
                    />
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      Click "Stream" or "Instant" to see the diff visualization
                    </div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="raw" className="mt-4">
                <Card className="p-4 bg-muted/50">
                  <pre className="text-xs whitespace-pre-wrap font-mono">
                    {displayedContent || 'No content yet...'}
                  </pre>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Info Card */}
          <Card className="p-6 bg-primary/5">
            <h3 className="font-semibold mb-2">How It Works</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary">1.</span>
                <span><strong>Detection:</strong> System detects SEARCH/REPLACE blocks in streaming content</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">2.</span>
                <span><strong>Buffering:</strong> SEARCH content is buffered silently (shows loading indicator)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">3.</span>
                <span><strong>Streaming:</strong> Once SEARCH closes, REPLACE content streams as code</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">4.</span>
                <span><strong>Diff View:</strong> When complete, instantly switches to unified diff view</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">✨</span>
                <span><strong>Custom Styling:</strong> Diff blocks display with a special "Updates" icon and emerald green color</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

