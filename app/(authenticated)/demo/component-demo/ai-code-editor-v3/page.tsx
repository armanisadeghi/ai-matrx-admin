'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContextAwareCodeEditorModal } from '@/features/code-editor/components';
import { Play } from 'lucide-react';

type DisplayVariant = 'standard' | 'compact';
type CodeExample = 'typescript' | 'python' | 'api';

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

const CODE_EXAMPLES = {
  typescript: { code: EXAMPLE_CODE, language: 'typescript', label: 'TypeScript Component' },
  python: { code: PYTHON_EXAMPLE, language: 'python', label: 'Python Script' },
  api: { code: API_EXAMPLE, language: 'typescript', label: 'Next.js API Route' },
};

export default function AICodeEditorV3DemoPage() {
  const [displayVariant, setDisplayVariant] = useState<DisplayVariant>('standard');
  const [codeExample, setCodeExample] = useState<CodeExample>('typescript');
  const [isOpen, setIsOpen] = useState(false);
  const [currentCode, setCurrentCode] = useState(EXAMPLE_CODE);
  const [currentVersion, setCurrentVersion] = useState(1);
  const [builtinId] = useState('970856c5-3b9d-4034-ac9d-8d8a11fb3dba');

  const handleCodeChange = (newCode: string, version: number) => {
    console.log(`Code updated to v${version} | Display: ${displayVariant}`);
    setCurrentCode(newCode);
    setCurrentVersion(version);
  };

  const handleRun = () => {
    const example = CODE_EXAMPLES[codeExample];
    setCurrentCode(example.code);
    setIsOpen(true);
  };

  const selectedExample = CODE_EXAMPLES[codeExample];

  return (
    <div className="h-[calc(100dvh-var(--header-height))] overflow-y-auto pb-safe">
      <div className="container max-w-4xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold">Code Editor V3 Tester</h1>
        
        {/* Controls */}
        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* Display Variant */}
            <div className="space-y-3">
              <Label>Display Variant</Label>
              <RadioGroup value={displayVariant} onValueChange={(v) => setDisplayVariant(v as DisplayVariant)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="standard" id="standard" />
                  <Label htmlFor="standard" className="font-normal cursor-pointer">Standard</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="compact" id="compact" />
                  <Label htmlFor="compact" className="font-normal cursor-pointer">Compact</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Code Example */}
            <div className="space-y-3">
              <Label>Code Example</Label>
              <Select value={codeExample} onValueChange={(v) => setCodeExample(v as CodeExample)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="typescript">{CODE_EXAMPLES.typescript.label}</SelectItem>
                  <SelectItem value="python">{CODE_EXAMPLES.python.label}</SelectItem>
                  <SelectItem value="api">{CODE_EXAMPLES.api.label}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Run Button */}
            <Button onClick={handleRun} className="w-full">
              <Play className="h-4 w-4 mr-2" />
              Run Test
            </Button>
          </CardContent>
        </Card>

        {/* Current Code Preview */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground mb-2">
              Version {currentVersion} | {selectedExample.language}
            </div>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
              <code>{currentCode}</code>
            </pre>
          </CardContent>
        </Card>
      </div>

      {/* Modal */}
      <ContextAwareCodeEditorModal
        open={isOpen}
        onOpenChange={setIsOpen}
        code={currentCode}
        language={selectedExample.language}
        builtinId={builtinId}
        onCodeChange={handleCodeChange}
        title={`Code Editor (${displayVariant})`}
        customMessage="Describe the code changes you want."
        countdownSeconds={5}
        displayVariant={displayVariant}
      />
    </div>
  );
}
