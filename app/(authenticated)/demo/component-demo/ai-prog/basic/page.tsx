'use client';

import { useState } from 'react';
import { AICodeEditorModal } from '@/features/code-editor/components/AICodeEditorModal';
import { getBuiltinId } from '@/lib/redux/prompt-execution/builtins';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CodeBlock from '@/features/code-editor/components/code-block/CodeBlock';
import { Sparkles, Code2 } from 'lucide-react';
import { PROMPT_BUILTINS, PromptBuiltin } from '@/lib/redux/prompt-execution/builtins';

// Sample code snippets for testing
const SAMPLE_CODE = {
  react: `import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Counter: {count}</h1>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}`,
  
  typescript: `interface User {
  id: string;
  name: string;
  email: string;
}

export async function fetchUser(userId: string): Promise<User | null> {
  const response = await fetch(\`/api/users/\${userId}\`);
  if (!response.ok) {
    return null;
  }
  return response.json();
}`,
  
  python: `def calculate_fibonacci(n):
    if n <= 1:
        return n
    return calculate_fibonacci(n-1) + calculate_fibonacci(n-2)

def main():
    result = calculate_fibonacci(10)
    print(f"Fibonacci(10) = {result}")

if __name__ == "__main__":
    main()`,
  
  javascript: `function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const handleSearch = debounce((query) => {
  console.log('Searching for:', query);
}, 300);`,
};

const LANGUAGES = [
  { value: 'react', label: 'React (TSX)', language: 'tsx' },
  { value: 'typescript', label: 'TypeScript', language: 'typescript' },
  { value: 'python', label: 'Python', language: 'python' },
  { value: 'javascript', label: 'JavaScript', language: 'javascript' },
] as const;

export default function AICodeEditorDemoPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSample, setSelectedSample] = useState<keyof typeof SAMPLE_CODE>('react');
  const [currentCode, setCurrentCode] = useState(SAMPLE_CODE.react);
  const [selectedBuiltinId, setSelectedBuiltinId] = useState<string>(getBuiltinId('generic-code-editor'));
  const [allowPromptSelection, setAllowPromptSelection] = useState(false);
  const [modalTitle, setModalTitle] = useState<string>('AI Code Editor');
  
  // Future: These will be populated when we have selection/context features
  const [selectedText] = useState<string | undefined>(undefined);
  const [multiFileContext] = useState<string | undefined>(undefined);

  const handleSampleChange = (value: keyof typeof SAMPLE_CODE) => {
    setSelectedSample(value);
    setCurrentCode(SAMPLE_CODE[value]);
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCodeChange = (newCode: string) => {
    setCurrentCode(newCode);
  };

  const selectedLanguage = LANGUAGES.find(l => l.value === selectedSample)?.language || 'typescript';

  return (
    <div className="h-[calc(100dvh-var(--header-height))] flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-primary" />
              AI Code Editor Demo
            </h1>
          </div>

          {/* Configuration */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Code2 className="w-5 h-5" />
              Configuration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Sample Code Selection */}
              <div className="space-y-2">
                <Label>Sample Code</Label>
                <Select value={selectedSample} onValueChange={handleSampleChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Builtin Selection */}
              <div className="space-y-2">
                <Label>Default Builtin Prompt</Label>
                <Select value={selectedBuiltinId} onValueChange={setSelectedBuiltinId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(PROMPT_BUILTINS).map((builtin: PromptBuiltin) => (
                      <SelectItem key={builtin.id} value={builtin.id}>
                        {builtin.name} ({builtin.key}) [{builtin.id}]
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Modal Title */}
              <div className="space-y-2">
                <Label>Modal Title</Label>
                <Select value={modalTitle} onValueChange={setModalTitle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AI Code Editor">AI Code Editor</SelectItem>
                    <SelectItem value="Edit Component">Edit Component</SelectItem>
                    <SelectItem value="Refactor Code">Refactor Code</SelectItem>
                    <SelectItem value="Code Assistant">Code Assistant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Allow Prompt Selection */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="allow-prompt-selection"
                  checked={allowPromptSelection}
                  onCheckedChange={setAllowPromptSelection}
                />
                <Label htmlFor="allow-prompt-selection" className="cursor-pointer">
                  Show Builtin Selector in Modal
                </Label>
              </div>
            </div>

            <div className="mt-6">
              <Button onClick={handleOpenModal} size="lg" className="w-full md:w-auto">
                <Sparkles className="w-4 h-4 mr-2" />
                Open AI Code Editor
              </Button>
            </div>
          </Card>

          {/* Current Code Display */}
          <div className="space-y-3">
            <Tabs defaultValue="code" className="w-full">
              <TabsList>
                <TabsTrigger value="code">Current Code</TabsTrigger>
                <TabsTrigger value="raw">Raw Text</TabsTrigger>
              </TabsList>

              <TabsContent value="code" className="mt-4">
                <div className="border rounded-lg overflow-hidden">
                  <CodeBlock
                    code={currentCode}
                    language={selectedLanguage}
                    showLineNumbers={true}
                    onCodeChange={handleCodeChange}
                  />
                </div>
              </TabsContent>

              <TabsContent value="raw" className="mt-4">
                <div className="border rounded-lg p-4 bg-muted/50">
                  <pre className="text-sm whitespace-pre-wrap font-mono">{currentCode}</pre>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* AI Code Editor Modal */}
      <AICodeEditorModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        currentCode={currentCode}
        language={selectedLanguage}
        builtinId={selectedBuiltinId}
        onCodeChange={handleCodeChange}
        title={modalTitle}
        allowPromptSelection={allowPromptSelection}
        // Optional: Future features
        selection={selectedText}
        context={multiFileContext}
      />
    </div>
  );
}
