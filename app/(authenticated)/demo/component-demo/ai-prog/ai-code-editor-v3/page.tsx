'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContextAwareCodeEditorModal } from '@/features/code-editor/components';
import { Play } from 'lucide-react';
import { CODE_FILES, type CodeFile } from '../sample-data';
import { getBuiltinId } from '@/lib/redux/prompt-execution/builtins';

type DisplayVariant = 'standard' | 'compact';

// TODO: The display variant is controled through the display component, not here. Need to update the logic here.

export default function AICodeEditorV3DemoPage() {
  const [displayVariant, setDisplayVariant] = useState<DisplayVariant>('standard');
  const [codeExample, setCodeExample] = useState<CodeFile>('types');
  const [isOpen, setIsOpen] = useState(false);
  const [currentCode, setCurrentCode] = useState(CODE_FILES.types.code);
  const [currentVersion, setCurrentVersion] = useState(1);

  const handleCodeChange = (newCode: string, version: number) => {
    console.log(`Code updated to v${version} | Display: ${displayVariant}`);
    setCurrentCode(newCode);
    setCurrentVersion(version);
  };

  const handleRun = () => {
    const example = CODE_FILES[codeExample];
    setCurrentCode(example.code);
    setIsOpen(true);
  };

  const selectedExample = CODE_FILES[codeExample];

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
              <Select value={codeExample} onValueChange={(v) => setCodeExample(v as CodeFile)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CODE_FILES).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
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
        builtinId={getBuiltinId('code-editor-dynamic-context')}
        onCodeChange={handleCodeChange}
        title={`Code Editor`}
        customMessage="Describe the code changes you want."
        countdownSeconds={5}
      />
    </div>
  );
}
