/**
 * Hook for Auto Creating Prompt Apps
 * 
 * Handles the execution of prompt builtins, code extraction, and app creation
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '@/lib/redux/hooks';
import { supabase } from '@/utils/supabase/client';
import { openPromptModal } from '@/lib/redux/slices/promptRunnerSlice';
import { executeBuiltinWithCodeExtraction, executeBuiltinWithJsonExtraction } from '@/lib/redux/prompt-execution';
import { validateSlugsInBatch } from '../services/slug-service';
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

  const createApp = async (data: AutoCreateAppData) => {
    setIsCreating(true);
    setProgress('Initializing AI generation...');

    // Store all debug info for error modal
    let codeGenerationResult: any = null;
    let metadataGenerationResult: any = null;
    let slugValidationResult: any = null;
    let databaseResult: any = null;

    try {
      // ========== STEP 1: START CODE GENERATION (FIRST - SLOWEST) ==========
      setProgress('Generating app code with AI...');
      console.log('[useAutoCreateApp] Starting code generation (slowest task)...');
      
      const codeBuiltinKey = data.mode === 'lightning' 
        ? 'prompt-app-auto-create-lightning'
        : 'prompt-app-auto-create';
      
      const codeGenerationPromise = dispatch(executeBuiltinWithCodeExtraction({
        builtinKey: codeBuiltinKey,
        variables: data.builtinVariables,
      })).unwrap();

      // ========== STEP 2: START METADATA GENERATION (IMMEDIATELY AFTER) ==========
      setProgress('Generating app metadata with AI...');
      console.log('[useAutoCreateApp] Starting metadata generation...');
      
      const metadataGenerationPromise = dispatch(executeBuiltinWithJsonExtraction({
        builtinKey: 'prompt-app-metadata-generator',
        variables: {
          prompt_object: data.builtinVariables.prompt_object,
        },
      })).unwrap();

      // ========== STEP 3: PREPARE VARIABLE SCHEMA (SYNCHRONOUS - FAST) ==========
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

      // ========== STEP 4: WAIT FOR METADATA, THEN VALIDATE SLUGS ==========
      setProgress('Waiting for metadata...');
      metadataGenerationResult = await metadataGenerationPromise;

      if (!metadataGenerationResult.success) {
        throw new Error(`Metadata generation failed: ${metadataGenerationResult.error}`);
      }

      const metadata: AppMetadata = metadataGenerationResult.data;
      console.log('[useAutoCreateApp] Metadata received:', metadata);

      // Add random fallback slug to the options
      const randomSlug = `${metadata.slug_options[0]}-${Math.floor(Math.random() * 900) + 100}`;
      const allSlugOptions = [...metadata.slug_options, randomSlug];

      // Validate slugs
      setProgress('Validating slug availability...');
      slugValidationResult = await validateSlugsInBatch(allSlugOptions);
      
      const selectedSlug = slugValidationResult.available.length > 0 
        ? slugValidationResult.available[0] 
        : randomSlug;
      
      console.log('[useAutoCreateApp] Slug selected:', selectedSlug);

      // ========== STEP 5: WAIT FOR CODE GENERATION ==========
      setProgress('Waiting for code generation to complete...');
      codeGenerationResult = await codeGenerationPromise;

      if (!codeGenerationResult.success) {
        throw new Error(`Code generation failed: ${codeGenerationResult.error}`);
      }

      console.log('[useAutoCreateApp] Code generation complete:', {
        codeLength: codeGenerationResult.code?.length,
      });

      // ========== STEP 6: SAVE TO DATABASE ==========
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
          component_code: codeGenerationResult.code!,
          component_language: 'tsx',
          variable_schema: variableSchema,
          allowed_imports: [
            'react',
            'lucide-react',
            '@/components/ui/button',
            '@/components/ui/input',
            '@/components/ui/textarea',
            '@/components/ui/card',
            '@/components/ui/label',
            '@/components/ui/select',
            '@/components/ui/slider',
            '@/components/ui/switch',
            '@/components/ui/tabs',
          ],
          rate_limit_per_ip: 10,
          rate_limit_window_hours: 24,
          status: 'draft',
        })
        .select()
        .single();

      databaseResult = { data: appData, error: insertError };

      if (insertError) {
        throw new Error(insertError.message || 'Failed to save app');
      }

      if (!appData) {
        throw new Error('No data returned from database');
      }

      // ========== SUCCESS! ==========
      setProgress('App created successfully!');
      console.log('[useAutoCreateApp] App created:', appData);
      
      options.onSuccess?.(appData.id);
      
      // Redirect to app page
      setTimeout(() => {
        router.push(`/prompt-apps/${appData.id}`);
      }, 500);

      return appData;

    } catch (error: any) {
      console.error('[useAutoCreateApp] Error:', error);
      
      // ========== COMPREHENSIVE ERROR MODAL ==========
      // Show ALL debug information in a modal
      const debugInfo = {
        error: error.message || 'Unknown error',
        codeGeneration: {
          success: codeGenerationResult?.success ?? null,
          error: codeGenerationResult?.error ?? null,
          codeLength: codeGenerationResult?.code?.length ?? 0,
          fullResponse: codeGenerationResult?.fullResponse ?? null,
        },
        metadataGeneration: {
          success: metadataGenerationResult?.success ?? null,
          error: metadataGenerationResult?.error ?? null,
          data: metadataGenerationResult?.data ?? null,
          fullResponse: metadataGenerationResult?.fullResponse ?? null,
        },
        slugValidation: {
          available: slugValidationResult?.available ?? null,
          unavailable: slugValidationResult?.unavailable ?? null,
        },
        database: {
          data: databaseResult?.data ?? null,
          error: databaseResult?.error ?? null,
        },
      };

      // Format debug info as JSON for display
      const debugJson = JSON.stringify(debugInfo, null, 2);
      
      dispatch(openPromptModal({
        title: '🐛 Auto-Create Debug Information',
        description: 'Something went wrong. Here is all the debug information:',
        initialMessages: [{
          role: 'assistant',
          content: `## Error Details\n\n**Error Message:** ${error.message}\n\n## Full Debug Information\n\n\`\`\`json\n${debugJson}\n\`\`\`\n\n---\n\n### Code Generation Response\n${codeGenerationResult?.fullResponse ? `\n\`\`\`\n${codeGenerationResult.fullResponse}\n\`\`\`\n` : 'No response available'}\n\n---\n\n### Metadata Generation Response\n${metadataGenerationResult?.fullResponse ? `\n\`\`\`\n${metadataGenerationResult.fullResponse}\n\`\`\`\n` : 'No response available'}`,
        }],
        executionConfig: {
          auto_run: false,
          allow_chat: false,
          show_variables: false,
          apply_variables: false,
          track_in_runs: false,
        },
      }));

      const errorMessage = error.message || 'An unexpected error occurred';
      options.onError?.(errorMessage);
      setIsCreating(false);
      return null;
    }
  };

  return {
    createApp,
    isCreating,
    progress,
  };
}

