'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Code2, Sparkles } from 'lucide-react';
import { AICodeEditorModalV2 } from '@/features/code-editor/components';
import CodeBlock from '@/features/code-editor/components/code-block/CodeBlock';

const SAMPLE_CODE = `function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}

const items = [
  { name: 'Apple', price: 1.99 },
  { name: 'Banana', price: 0.99 },
  { name: 'Orange', price: 2.49 }
];

console.log('Total:', calculateTotal(items));`;

const SAMPLE_REACT_CODE = `export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}`;

const SAMPLE_PYTHON_CODE = `def calculate_fibonacci(n):
    if n <= 1:
        return n
    return calculate_fibonacci(n-1) + calculate_fibonacci(n-2)

# Calculate the first 10 Fibonacci numbers
for i in range(10):
    print(f"fib({i}) = {calculate_fibonacci(i)}")`;

export default function AICodeEditorV2Demo() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentCode, setCurrentCode] = useState(SAMPLE_CODE);
  const [language, setLanguage] = useState('javascript');
  const [selectedBuiltinId, setSelectedBuiltinId] = useState<string | undefined>(undefined);

  const samples = [
    { name: 'JavaScript Function', code: SAMPLE_CODE, language: 'javascript' },
    { name: 'React Component', code: SAMPLE_REACT_CODE, language: 'tsx' },
    { name: 'Python Script', code: SAMPLE_PYTHON_CODE, language: 'python' },
  ];

  const handleOpenEditor = (sample?: { code: string; language: string }) => {
    if (sample) {
      setCurrentCode(sample.code);
      setLanguage(sample.language);
    }
    setIsOpen(true);
  };

  const handleCodeChange = (newCode: string) => {
    setCurrentCode(newCode);
    console.log('✅ Code updated successfully!');
  };

  return (
    <div className="h-[calc(100dvh-var(--header-height))] flex flex-col overflow-hidden bg-textured">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">AI Code Editor V2</h1>
                <p className="text-muted-foreground">
                  Next-generation code editor with natural conversation and canvas preview
                </p>
              </div>
            </div>
          </div>

          {/* Features */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">What's New in V2?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Natural Conversation Flow
                </div>
                <p className="text-sm text-muted-foreground pl-4">
                  True chat experience with streaming responses - no complex state management
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Canvas Integration
                </div>
                <p className="text-sm text-muted-foreground pl-4">
                  Code preview automatically opens in side panel with diff view
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Better Error Handling
                </div>
                <p className="text-sm text-muted-foreground pl-4">
                  Clear error messages in canvas when edits don't match current code
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Reuses Existing Components
                </div>
                <p className="text-sm text-muted-foreground pl-4">
                  Built on PromptRunner and existing infrastructure
                </p>
              </div>
            </div>
          </Card>

          {/* Sample Code Selection */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Try It Out</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Select a code sample to edit with AI:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {samples.map((sample) => (
                <Button
                  key={sample.name}
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-start gap-2"
                  onClick={() => handleOpenEditor(sample)}
                >
                  <Code2 className="w-4 h-4 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">{sample.name}</div>
                    <div className="text-xs text-muted-foreground">{sample.language}</div>
                  </div>
                </Button>
              ))}
            </div>
          </Card>

          {/* Current Code Display */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Current Code</h2>
              <Button onClick={() => handleOpenEditor()} className="gap-2">
                <Sparkles className="w-4 h-4" />
                Edit with AI
              </Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <CodeBlock
                code={currentCode}
                language={language}
                showLineNumbers={true}
              />
            </div>
          </Card>

          {/* Instructions */}
          <Card className="p-6 bg-muted/50">
            <h3 className="font-semibold mb-2">How to Use</h3>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Select a code sample or click "Edit with AI" on the current code</li>
              <li>Have a natural conversation with AI about what changes you want</li>
              <li>When AI provides code edits, they automatically appear in the canvas panel</li>
              <li>Review the changes in the diff view, then Apply or Discard</li>
              <li>Continue the conversation to make further adjustments</li>
            </ol>
          </Card>
        </div>
      </div>

      {/* AI Code Editor Modal V2 */}
      <AICodeEditorModalV2
        open={isOpen}
        onOpenChange={setIsOpen}
        currentCode={currentCode}
        language={language}
        builtinId={selectedBuiltinId}
        promptContext="generic"
        onCodeChange={handleCodeChange}
        title="AI Code Editor V2"
        allowPromptSelection={true}
      />
    </div>
  );
}

