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
import { executeBuiltinWithCodeExtraction } from '@/lib/redux/prompt-execution';
import { generateSlugCandidates, validateSlugsInBatch } from '../services/slug-service';

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
    setProgress('Initializing AI code generation...');

    try {
      // ========== PARALLEL EXECUTION ==========
      // Start AI code generation immediately (SLOW - don't wait)
      setProgress('Generating app code with AI...');
      
      // Determine which builtin to use
      const builtinKey = data.mode === 'lightning' 
        ? 'prompt-app-auto-create-lightning'
        : 'prompt-app-auto-create';
      
      const codeGenerationPromise = dispatch(executeBuiltinWithCodeExtraction({
        builtinKey,
        variables: data.builtinVariables,
      })).unwrap();

      // While AI is running, prepare metadata (FAST)
      setProgress('Preparing app metadata...');
      const promptName = data.prompt?.name || 'Untitled App';
      
      // Generate slug candidates
      const slugCandidates = generateSlugCandidates(promptName);
      
      // Validate slugs while AI is running
      const slugValidationPromise = validateSlugsInBatch(slugCandidates.slice(0, 5))
        .then(({ available }) => {
          const selectedSlug = available.length > 0 
            ? available[0] 
            : slugCandidates[slugCandidates.length - 1];
          console.log('[useAutoCreateApp] Slug selected:', selectedSlug);
          return selectedSlug;
        })
        .catch((error) => {
          console.warn('[useAutoCreateApp] Slug validation failed, using fallback:', error);
          return slugCandidates[slugCandidates.length - 1];
        });

      // Parse variable schema (synchronous, fast)
      let variableSchema: any[] = [];
      if (data.prompt?.variable_defaults && Array.isArray(data.prompt.variable_defaults)) {
        variableSchema = data.prompt.variable_defaults.map((v: any) => ({
          name: v.name,
          type: 'text',
          label: v.name.split('_').map((w: string) => 
            w.charAt(0).toUpperCase() + w.slice(1)
          ).join(' '),
          default: v.defaultValue || '',
          required: false,
        }));
      }

      // ========== WAIT FOR PARALLEL TASKS ==========
      // Wait for both AI code generation and slug validation to complete
      setProgress('Finalizing app creation...');
      const [codeResult, appSlug] = await Promise.all([
        codeGenerationPromise,
        slugValidationPromise
      ]);

      // Check if code generation succeeded
      if (!codeResult.success) {
        console.error('[useAutoCreateApp] Failed to generate code:', codeResult.error);
        
        if (codeResult.fullResponse) {
          // Show the full response in a modal so user can see what went wrong
          dispatch(openPromptModal({
            title: 'Code Generation Error',
            description: 'The AI encountered an issue. Here is the full response:',
            initialMessages: [{
              role: 'assistant',
              content: codeResult.fullResponse,
            }],
            executionConfig: {
              auto_run: false,
              allow_chat: false,
              show_variables: false,
              apply_variables: false,
              track_in_runs: false,
            },
          }));
        }
        
        options.onError?.(codeResult.error || 'Failed to generate code');
        setIsCreating(false);
        return null;
      }

      console.log('[useAutoCreateApp] Code and metadata ready:', {
        codeLength: codeResult.code?.length,
        slug: appSlug,
        variableCount: variableSchema.length
      });

      // ========== SAVE TO DATABASE ==========
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
          slug: appSlug,
          name: promptName,
          tagline: `Auto-generated ${promptName} app`,
          description: data.prompt.description || `Powerful ${promptName} application with custom UI`,
          category: null,
          tags: [],
          component_code: codeResult.code!,
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

      if (insertError) {
        throw new Error(insertError.message || 'Failed to save app');
      }

      if (!appData) {
        throw new Error('No data returned from database');
      }

      // Step 4: Success!
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

