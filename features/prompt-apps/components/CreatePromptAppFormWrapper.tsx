'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wrench, Sparkles } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { CreatePromptAppForm } from './CreatePromptAppForm';
import { AutoCreatePromptAppForm } from './AutoCreatePromptAppForm';
import { SearchablePromptSelect } from './SearchablePromptSelect';

interface CreatePromptAppFormWrapperProps {
  prompts: any[];
  categories: any[];
  preselectedPromptId?: string;
  preselectedPrompt?: any;
  onSuccess?: () => void;
}

export function CreatePromptAppFormWrapper({ 
  prompts, 
  categories, 
  preselectedPromptId,
  preselectedPrompt,
  onSuccess 
}: CreatePromptAppFormWrapperProps) {
  const [activeTab, setActiveTab] = useState<string>('auto');
  const [selectedPromptId, setSelectedPromptId] = useState<string | undefined>(
    preselectedPromptId
  );
  const [selectedPrompt, setSelectedPrompt] = useState<any>(preselectedPrompt);

  // Initialize from preselected values
  useEffect(() => {
    if (preselectedPromptId && !selectedPromptId) {
      setSelectedPromptId(preselectedPromptId);
    }
    if (preselectedPrompt && !selectedPrompt) {
      setSelectedPrompt(preselectedPrompt);
    }
    // Find prompt by ID if we have ID but not the object
    if (preselectedPromptId && !preselectedPrompt && prompts.length > 0) {
      const found = prompts.find(p => p.id === preselectedPromptId);
      if (found) {
        setSelectedPrompt(found);
      }
    }
  }, [preselectedPromptId, preselectedPrompt, prompts]);

  const handlePromptChange = (promptId: string, prompt: any) => {
    setSelectedPromptId(promptId);
    setSelectedPrompt(prompt);
  };

  return (
    <div className="w-full space-y-8">
      {/* Prompt Selection Header - Always Visible */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Select Your Prompt</Label>
          {selectedPrompt && (
            <span className="text-xs text-muted-foreground">
              {prompts.length} prompt{prompts.length !== 1 ? 's' : ''} available
            </span>
          )}
        </div>
        <SearchablePromptSelect
          prompts={prompts}
          value={selectedPromptId}
          onChange={handlePromptChange}
          placeholder="Choose the prompt to power your app..."
        />
      </div>

      {/* Tabs - Only enabled when prompt is selected */}
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="w-full"
      >
        <div className="flex justify-center mb-8">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger 
              value="auto" 
              className="gap-2"
              disabled={!selectedPromptId}
            >
              <Sparkles className="w-4 h-4" />
              Auto Create
            </TabsTrigger>
            <TabsTrigger 
              value="manual" 
              className="gap-2"
              disabled={!selectedPromptId}
            >
              <Wrench className="w-4 h-4" />
              Create Manually
            </TabsTrigger>
          </TabsList>
        </div>

        {!selectedPromptId && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground text-lg">
                Select a prompt above to continue
              </p>
              <p className="text-sm text-muted-foreground">
                Your prompt will power the AI behind your app
              </p>
            </div>
          </div>
        )}

        {selectedPromptId && (
          <>
            <TabsContent value="auto" className="mt-0">
              <AutoCreatePromptAppForm
                prompt={selectedPrompt}
                prompts={prompts}
                categories={categories}
                onSuccess={onSuccess}
              />
            </TabsContent>

            <TabsContent value="manual" className="mt-0">
              <CreatePromptAppForm
                prompts={prompts}
                categories={categories}
                preselectedPromptId={selectedPromptId}
                onSuccess={onSuccess}
              />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

