'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ContextAwareCodeEditorModal } from '@/features/code-editor/components/ContextAwareCodeEditorModal';
import { Sparkles, Code2, FileCode, Wand2 } from 'lucide-react';

export default function AICodeEditorV3DemoPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentCode, setCurrentCode] = useState(EXAMPLE_CODE);
  const [currentVersion, setCurrentVersion] = useState(1);
  const [language, setLanguage] = useState('typescript');
  const [builtinId] = useState('970856c5-3b9d-4034-ac9d-8d8a11fb3dba'); // Code Editor (Dynamic Context)

  const handleCodeChange = (newCode: string, version: number) => {
    console.log(`✅ Code updated to version ${version}`);
    setCurrentCode(newCode);
    setCurrentVersion(version);
  };

  const handleOpenModal = (exampleCode: string, exampleLanguage: string) => {
    setCurrentCode(exampleCode);
    setLanguage(exampleLanguage);
    setIsOpen(true);
  };

  return (
    <div className="h-[calc(100dvh-var(--header-height))] overflow-y-auto pb-safe">
      <div className="container max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            <h1 className="text-3xl font-bold">AI Code Editor V3 Demo</h1>
          </div>
          <p className="text-muted-foreground">
            Context-Aware editing with version management. Make unlimited edits without context window bloat!
          </p>
        </div>

        {/* Key Features */}
        <Card>
          <CardHeader>
            <CardTitle>🚀 Key Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 dark:text-purple-400 text-xs font-semibold">1</span>
              </div>
              <div>
                <div className="font-medium">Dynamic Context Management</div>
                <div className="text-sm text-muted-foreground">
                  The <code className="text-xs bg-muted px-1 py-0.5 rounded">dynamic_context</code> variable is injected before each message with the current version + tombstones
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 dark:text-purple-400 text-xs font-semibold">2</span>
              </div>
              <div>
                <div className="font-medium">Version Tombstones</div>
                <div className="text-sm text-muted-foreground">
                  Old versions are replaced with compact summaries: "Version X: [CONTENT REMOVED - See current version]"
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 dark:text-purple-400 text-xs font-semibold">3</span>
              </div>
              <div>
                <div className="font-medium">Unlimited Iterations</div>
                <div className="text-sm text-muted-foreground">
                  Make as many edits as you want - only ONE full version is in the context at any time
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 dark:text-purple-400 text-xs font-semibold">4</span>
              </div>
              <div>
                <div className="font-medium">Conversation Flow</div>
                <div className="text-sm text-muted-foreground">
                  Continue the conversation naturally - the AI always has the latest code context
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Code */}
        <Card>
          <CardHeader>
            <CardTitle>Current Code (Version {currentVersion})</CardTitle>
            <CardDescription>This is the code that will be edited</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
              <code>{currentCode}</code>
            </pre>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Try It Out</CardTitle>
            <CardDescription>Open the editor and start making changes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => handleOpenModal(EXAMPLE_CODE, 'typescript')}
                className="h-auto py-4 flex flex-col items-start gap-2"
                variant="outline"
              >
                <div className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  <span className="font-semibold">TypeScript Component</span>
                </div>
                <span className="text-xs text-muted-foreground text-left">
                  Edit a React component with TypeScript
                </span>
              </Button>

              <Button
                onClick={() => handleOpenModal(PYTHON_EXAMPLE, 'python')}
                className="h-auto py-4 flex flex-col items-start gap-2"
                variant="outline"
              >
                <div className="flex items-center gap-2">
                  <FileCode className="h-5 w-5" />
                  <span className="font-semibold">Python Script</span>
                </div>
                <span className="text-xs text-muted-foreground text-left">
                  Edit a Python data processing script
                </span>
              </Button>

              <Button
                onClick={() => handleOpenModal(API_EXAMPLE, 'typescript')}
                className="h-auto py-4 flex flex-col items-start gap-2"
                variant="outline"
              >
                <div className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  <span className="font-semibold">API Route</span>
                </div>
                <span className="text-xs text-muted-foreground text-left">
                  Edit a Next.js API route handler
                </span>
              </Button>

              <Button
                onClick={() => handleOpenModal(currentCode, language)}
                className="h-auto py-4 flex flex-col items-start gap-2"
                variant="default"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  <span className="font-semibold">Edit Current Code</span>
                </div>
                <span className="text-xs text-muted-foreground text-left">
                  Continue editing the code shown above
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Testing Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Testing Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="font-medium mb-1">1. Open the editor</div>
              <div className="text-muted-foreground">Click any button above to open the V3 modal</div>
            </div>
            <div>
              <div className="font-medium mb-1">2. Make your first change</div>
              <div className="text-muted-foreground">
                Type something like "Add error handling" and send. The AI will respond with edits.
              </div>
            </div>
            <div>
              <div className="font-medium mb-1">3. Review & Apply</div>
              <div className="text-muted-foreground">
                The canvas will open showing the diff. Click "Apply" to accept.
              </div>
            </div>
            <div>
              <div className="font-medium mb-1">4. Continue editing</div>
              <div className="text-muted-foreground">
                Type another instruction like "Add loading state". The AI now has the UPDATED code (v2).
                The old version (v1) is replaced with a tombstone.
              </div>
            </div>
            <div>
              <div className="font-medium mb-1">5. Check the console</div>
              <div className="text-muted-foreground">
                Open DevTools console to see version updates and context stats showing how much we're saving!
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal */}
      <ContextAwareCodeEditorModal
        open={isOpen}
        onOpenChange={setIsOpen}
        code={currentCode}
        language={language}
        builtinId={builtinId}
        onCodeChange={handleCodeChange}
        title="AI Code Editor V3 (Context-Aware)"
        customMessage="Describe the specific code changes you want to make. Be clear about what functionality to add, modify, or remove."
        countdownSeconds={10}
      />
    </div>
  );
}

// Example code snippets
const EXAMPLE_CODE = `interface UserProps {
  name: string;
  email: string;
}

export function UserProfile({ name, email }: UserProps) {
  return (
    <div className="user-profile">
      <h2>{name}</h2>
      <p>{email}</p>
    </div>
  );
}`;

const PYTHON_EXAMPLE = `import pandas as pd
from typing import List

def process_data(file_path: str) -> pd.DataFrame:
    """Process CSV data and return cleaned DataFrame"""
    df = pd.read_csv(file_path)
    df = df.dropna()
    df['total'] = df['quantity'] * df['price']
    return df

def main():
    data = process_data('data.csv')
    print(f"Processed {len(data)} rows")

if __name__ == '__main__':
    main()`;

const API_EXAMPLE = `import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { error: 'Missing userId parameter' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}`;

