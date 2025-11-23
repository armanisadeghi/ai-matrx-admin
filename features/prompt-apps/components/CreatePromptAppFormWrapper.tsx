'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wrench, Sparkles } from 'lucide-react';
import { CreatePromptAppForm } from './CreatePromptAppForm';
import { AutoCreatePromptAppForm } from './AutoCreatePromptAppForm';

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

  // Find the preselected prompt if we have an ID
  const prompt = preselectedPrompt || prompts.find(p => p.id === preselectedPromptId);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="flex justify-center mb-8">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="auto" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Auto Create
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2">
            <Wrench className="w-4 h-4" />
            Create Manually
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="auto" className="mt-0">
        <AutoCreatePromptAppForm
          prompt={prompt}
          prompts={prompts}
          categories={categories}
          onSuccess={onSuccess}
        />
      </TabsContent>

      <TabsContent value="manual" className="mt-0">
        <CreatePromptAppForm
          prompts={prompts}
          categories={categories}
          preselectedPromptId={preselectedPromptId}
          onSuccess={onSuccess}
        />
      </TabsContent>
    </Tabs>
  );
}

