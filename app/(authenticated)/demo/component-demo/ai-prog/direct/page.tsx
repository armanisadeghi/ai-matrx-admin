'use client';

import { useState } from 'react';
import { AICodeEditor } from '@/features/code-editor/components/AICodeEditor';
import { getBuiltinId } from '@/lib/redux/prompt-execution/builtins';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Code2, Bug } from 'lucide-react';
import { PROMPT_BUILTINS, PromptBuiltin } from '@/lib/redux/prompt-execution/builtins';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { toggleDebugMode, selectIsDebugMode } from '@/lib/redux/slices/adminDebugSlice';

const SAMPLE_CODE = `interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  role: 'admin' | 'user' | 'guest';
}

interface UserResponse {
  data: User | null;
  error?: string;
}

export async function fetchUser(userId: string): Promise<UserResponse> {
  try {
    const response = await fetch(\`/api/users/\${userId}\`);
    
    if (!response.ok) {
      return {
        data: null,
        error: 'Failed to fetch user'
      };
    }
    
    const data = await response.json();
    return { data };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export function validateUser(user: User): boolean {
  return !!(user.id && user.name && user.email);
}`;

export default function AICodeEditorDirectDemoPage() {
  const dispatch = useAppDispatch();
  const isDebugMode = useAppSelector(selectIsDebugMode);
  
  const [currentCode, setCurrentCode] = useState(SAMPLE_CODE);
  const [selectedBuiltinId, setSelectedBuiltinId] = useState<string>(getBuiltinId('generic-code-editor'));
  const [allowPromptSelection, setAllowPromptSelection] = useState(false);
  const [showHeader, setShowHeader] = useState(true);

  const handleCodeChange = (newCode: string) => {
    setCurrentCode(newCode);
  };

  const handleToggleDebugMode = () => {
    dispatch(toggleDebugMode());
  };

  return (
    <div className="h-[calc(100dvh-var(--header-height))] flex gap-4 p-4 overflow-hidden">
      {/* Left Sidebar - Options */}
      <div className="w-80 flex-shrink-0 overflow-y-auto">
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Code2 className="w-5 h-5" />
            Direct Editor Test
          </h2>
          
          <div className="space-y-4">
            {/* Builtin Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">AI Prompt Mode</Label>
              <Select value={selectedBuiltinId} onValueChange={setSelectedBuiltinId}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PROMPT_BUILTINS).map((builtin: PromptBuiltin) => (
                    <SelectItem key={builtin.id} value={builtin.id}>
                      {builtin.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Show Prompt Selector in Editor */}
            <div className="flex items-center justify-between">
              <Label htmlFor="allow-prompt-selection" className="text-xs font-medium cursor-pointer">
                Show Mode Selector
              </Label>
              <Switch
                id="allow-prompt-selection"
                checked={allowPromptSelection}
                onCheckedChange={setAllowPromptSelection}
              />
            </div>

            {/* Show Header */}
            <div className="flex items-center justify-between">
              <Label htmlFor="show-header" className="text-xs font-medium cursor-pointer">
                Show Header
              </Label>
              <Switch
                id="show-header"
                checked={showHeader}
                onCheckedChange={setShowHeader}
              />
            </div>

            {/* Debug Mode */}
            <div className="pt-4 border-t space-y-2">
              <Label className="text-xs font-medium">Debug Mode</Label>
              <Button
                variant={isDebugMode ? "default" : "outline"}
                size="sm"
                onClick={handleToggleDebugMode}
                className="w-full"
              >
                <Bug className="w-4 h-4 mr-2" />
                {isDebugMode ? 'Debug Mode ON' : 'Debug Mode OFF'}
              </Button>
              <p className="text-[10px] text-muted-foreground">
                Enables debug indicators and detailed state inspection
              </p>
            </div>

            {/* Info */}
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                This is a direct/embedded mode test. The editor is rendered inline without a modal wrapper.
              </p>
            </div>

            {/* Code Stats */}
            <div className="pt-4 border-t space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Lines:</span>
                <span className="font-mono">{currentCode.split('\n').length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Characters:</span>
                <span className="font-mono">{currentCode.length}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Right - AI Code Editor (Direct/Embedded) */}
      <div className="flex-1 min-w-0 border rounded-lg overflow-hidden bg-background">
        <AICodeEditor
          open={true}
          onOpenChange={() => {}}
          currentCode={currentCode}
          language="typescript"
          builtinId={selectedBuiltinId}
          onCodeChange={handleCodeChange}
          allowPromptSelection={allowPromptSelection}
          showHeader={showHeader}
          className="h-full"
        />
      </div>
    </div>
  );
}
