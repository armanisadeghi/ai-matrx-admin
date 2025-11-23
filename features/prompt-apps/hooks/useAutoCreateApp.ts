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
import { getStore, type AppDispatch } from '@/lib/redux/store';
import { 
  executeAutoCreateBuiltin, 
  generateAppSlug,
  type AutoCreateMode 
} from '../services/auto-create-service';

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
      // Step 1: Execute the builtin and get the code
      setProgress('Generating app code with AI...');
      
      const store = getStore();
      if (!store) {
        throw new Error('Redux store not available');
      }

      const result = await executeAutoCreateBuiltin(
        dispatch as AppDispatch,
        () => store.getState(),
        data.builtinVariables,
        data.mode || 'standard'
      );

      if (!result.success) {
        // Show error in modal with full response if available
        console.error('[useAutoCreateApp] Failed to generate code:', result.error);
        
        if (result.fullResponse) {
          // Show the full response in a modal so user can see what went wrong
          dispatch(openPromptModal({
            title: 'Code Generation Error',
            description: 'The AI encountered an issue. Here is the full response:',
            initialMessages: [{
              role: 'assistant',
              content: result.fullResponse,
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
        
        options.onError?.(result.error || 'Failed to generate code');
        setIsCreating(false);
        return null;
      }

      // Step 2: Prepare app data
      setProgress('Preparing app data...');
      
      const promptName = data.prompt?.name || 'Untitled App';
      const appSlug = generateAppSlug(promptName);
      
      // Parse variable schema from prompt
      let variableSchema: any[] = [];
      if (data.prompt?.variable_defaults && Array.isArray(data.prompt.variable_defaults)) {
        variableSchema = data.prompt.variable_defaults.map((v: any) => ({
          name: v.name,
          type: 'text',
          label: v.name.split('_').map((w: string) => 
            w.charAt(0).toUpperCase() + w.slice(1)
          ).join(' '),
          defaultValue: v.defaultValue || '',
          required: false,
        }));
      }

      // Step 3: Save to database
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
          category: null, // Can be set later
          tags: [],
          component_code: result.code!,
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

