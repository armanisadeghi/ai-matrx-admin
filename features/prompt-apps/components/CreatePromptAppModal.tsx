'use client';

import { useState, useEffect } from 'react';
import FullScreenOverlay, { TabDefinition } from '@/components/official/FullScreenOverlay';
import { CreatePromptAppForm } from './CreatePromptAppForm';
import { AutoCreatePromptAppForm } from './AutoCreatePromptAppForm';
import { supabase } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';

interface CreatePromptAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** If provided, this prompt will be pre-selected */
  promptId?: string;
  /** Full prompt object for auto-create functionality */
  prompt?: any;
}

export function CreatePromptAppModal({ isOpen, onClose, promptId, prompt }: CreatePromptAppModalProps) {
  const [prompts, setPrompts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);


    try {
      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch prompts - get all fields for auto-create
      const { data: promptsData, error: promptsError } = await supabase
        .from('prompts')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (promptsError) throw promptsError;

      // Fetch categories (table might not exist yet)
      const { data: categoriesData } = await supabase
        .from('prompt_app_categories')
        .select('*')
        .order('sort_order');

      setPrompts(promptsData || []);
      setCategories(categoriesData || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const tabs: TabDefinition[] = [

    {
      id: 'auto',
      label: 'Auto Create',
      content: isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-destructive font-semibold">{error}</p>
            <button 
              onClick={loadData}
              className="mt-4 text-sm text-primary hover:underline"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6">
          <AutoCreatePromptAppForm 
            prompt={prompt || prompts.find(p => p.id === promptId)}
            prompts={prompts}
            categories={categories}
            onSuccess={onClose}
          />
        </div>
      ),
    },
    {
      id: 'manual',
      label: 'Create Manually',
      content: isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-destructive font-semibold">{error}</p>
            <button 
              onClick={loadData}
              className="mt-4 text-sm text-primary hover:underline"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6">
          <CreatePromptAppForm 
            prompts={prompts}
            categories={categories}
            preselectedPromptId={promptId}
            onSuccess={onClose}
          />
        </div>
      ),
    },
  ];

  return (
    <FullScreenOverlay
      isOpen={isOpen}
      onClose={onClose}
      title=""
      description="Turn your prompt into a shareable web app"
      tabs={tabs}
      showCancelButton
      cancelButtonLabel="Close"
      onCancel={onClose}
      width="90vw"
      height="90dvh"
    />
  );
}

