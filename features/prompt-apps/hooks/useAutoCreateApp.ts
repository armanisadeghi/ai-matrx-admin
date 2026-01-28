/**
 * Hook for Auto Creating Prompt Apps
 * 
 * Handles the execution of prompt builtins, code extraction, and app creation
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '@/lib/redux/hooks';
import { supabase } from '@/utils/supabase/client';
import { executeBuiltinWithCodeExtraction, executeBuiltinWithJsonExtraction } from '@/lib/redux/prompt-execution';
import { validateSlugsInBatch, generateSlugCandidates } from '../services/slug-service';
import { getDefaultImportsForNewApps } from '../utils/allowed-imports';
import type { AppMetadata } from '../types';

export type AutoCreateMode = 'standard' | 'lightning';

interface UseAutoCreateAppOptions {
  onSuccess?: (appId: string) => void;
  onError?: (error: string) => void;
}

interface AutoCreateAppData {
  prompt: any;
  builtinVariables: {
    prompt_object: string;
    sample_response: string;
    input_fields_to_include: string;
    page_layout_format: string;
    response_display_component: string;
    response_display_mode: string;
    color_pallet_options: string;
    custom_instructions: string;
  };
  mode?: AutoCreateMode;
}

export function useAutoCreateApp(options: UseAutoCreateAppOptions = {}) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [codeTaskId, setCodeTaskId] = useState<string | null>(null);
  const [metadataTaskId, setMetadataTaskId] = useState<string | null>(null);

  const createApp = async (data: AutoCreateAppData) => {
    setIsCreating(true);
    setProgress('Initializing AI generation...');

    try {
      // Generate metadata first (fast)
      setProgress('Generating metadata...');
      
      const metadataResult = await dispatch(executeBuiltinWithJsonExtraction({
        builtinKey: 'prompt-app-metadata-generator',
        variables: {
          prompt_config: data.builtinVariables.prompt_object,
        },
        timeoutMs: 180000,
      })).unwrap();
      
      if (metadataResult.taskId) {
        setMetadataTaskId(metadataResult.taskId);
      }
      
      if (!metadataResult.success) {
        throw new Error(`Metadata generation failed: ${metadataResult.error}`);
      }

      const metadata: AppMetadata = metadataResult.data;
      
      // Generate code second (slow)
      setProgress('Generating code...');
      
      const codeBuiltinKey = data.mode === 'lightning' 
        ? 'prompt-app-auto-create-lightning'
        : 'prompt-app-auto-create';
      
      const codeResult = await dispatch(executeBuiltinWithCodeExtraction({
        builtinKey: codeBuiltinKey,
        variables: data.builtinVariables,
        timeoutMs: 300000,
      })).unwrap();
      
      if (codeResult.taskId) {
        setCodeTaskId(codeResult.taskId);
      }
      
      if (!codeResult.success) {
        throw new Error(`Code generation failed: ${codeResult.error}`);
      }

      // Prepare variable schema
      let variableSchema: any[] = [];
      if (data.prompt?.variable_defaults && Array.isArray(data.prompt.variable_defaults)) {
        variableSchema = data.prompt.variable_defaults.map((v: any) => ({
          name: v.name,
          type: 'string',
          label: v.name.split('_').map((w: string) => 
            w.charAt(0).toUpperCase() + w.slice(1)
          ).join(' '),
          default: v.defaultValue || '',
          required: false,
        }));
      }

      // Validate slugs
      setProgress('Validating slug availability...');
      
      let selectedSlug: string;
      
      // Get slug options from metadata, or generate fallbacks from prompt name
      const slugOptions = Array.isArray(metadata.slug_options) && metadata.slug_options.length > 0
        ? metadata.slug_options
        : generateSlugCandidates(data.prompt?.name || metadata.name || 'app');
      
      try {
        const slugValidation = await validateSlugsInBatch(slugOptions.slice(0, 5));
        
        if (slugValidation.available && slugValidation.available.length > 0) {
          selectedSlug = slugValidation.available[0];
        } else {
          // All slugs taken, add random number to first option
          selectedSlug = `${slugOptions[0]}-${Math.floor(Math.random() * 900) + 100}`;
        }
      } catch (slugError: any) {
        // Fallback: use first slug option with random number
        selectedSlug = `${slugOptions[0]}-${Math.floor(Math.random() * 900) + 100}`;
      }

      // Save to database
      setProgress('Saving app to database...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: appData, error: insertError } = await supabase
        .from('prompt_apps')
        .insert({
          user_id: user.id,
          prompt_id: data.prompt.id,
          slug: selectedSlug,
          name: metadata.name,
          tagline: metadata.tagline,
          description: metadata.description,
          category: metadata.category,
          tags: metadata.tags,
          component_code: codeResult.code!,
          component_language: 'tsx',
          variable_schema: variableSchema,
          allowed_imports: getDefaultImportsForNewApps(),
          rate_limit_per_ip: 10,
          rate_limit_window_hours: 24,
          status: 'draft',
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message || 'Failed to save app');
      }

      if (!appData) {
        throw new Error('No data returned from database');
      }

      setProgress('App created successfully!');
      
      options.onSuccess?.(appData.id);
      
      // Redirect to app page
      setTimeout(() => {
        router.push(`/prompt-apps/${appData.id}`);
      }, 500);

      return appData;

    } catch (error: any) {
      const errorMessage = error.message || 'An unexpected error occurred';
      options.onError?.(errorMessage);
      setIsCreating(false);
      setProgress('');
      return null;
    }
  };

  return {
    createApp,
    isCreating,
    progress,
    codeTaskId,
    metadataTaskId,
  };
}

