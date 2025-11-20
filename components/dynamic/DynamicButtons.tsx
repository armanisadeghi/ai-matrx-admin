/**
 * DynamicButtons
 * 
 * Database-driven button group that loads system prompts configured as buttons.
 * Shows disabled state for placeholders.
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useButtonPrompts } from '@/hooks/useSystemPrompts';
import { PromptContextResolver, type UIContext } from '@/lib/services/prompt-context-resolver';
import { PromptRunnerModal } from '@/features/prompts/components/modal/PromptRunnerModal';
import { Loader2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface DynamicButtonsProps {
  category?: string;
  context?: UIContext;
  renderAs?: 'inline' | 'grid' | 'stack';
  className?: string;
}

export function DynamicButtons({
  category,
  context: uiContext = {},
  renderAs = 'inline',
  className,
}: DynamicButtonsProps) {
  const { systemPrompts, loading } = useButtonPrompts(category);
  const [executingId, setExecutingId] = React.useState<string | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalConfig, setModalConfig] = React.useState<any>(null);

  const handleButtonClick = async (systemPrompt: any) => {
    // Check if placeholder
    if (systemPrompt.prompt_snapshot?.placeholder) {
      return; // Disabled
    }

    try {
      setExecutingId(systemPrompt.id);

      // Resolve variables
      const variables = PromptContextResolver.resolve(
        systemPrompt.prompt_snapshot,
        systemPrompt.functionality_id,
        'button',
        uiContext
      );

      // Check if can resolve
      const canResolve = PromptContextResolver.canResolve(
        systemPrompt.prompt_snapshot,
        systemPrompt.functionality_id,
        'button',
        uiContext
      );

      if (!canResolve.canResolve) {
        console.warn(`Cannot resolve variables for ${systemPrompt.name}:`, canResolve.missingVariables);
        return;
      }

      // Get placement settings
      const settings = systemPrompt.placement_settings || {};
      const allowChat = settings.allowChat ?? true;
      const allowInitialMessage = settings.allowInitialMessage ?? false;

      // Open modal with the prompt
      setModalConfig({
        promptData: systemPrompt.prompt_snapshot,
        variables,
        executionConfig: {
          auto_run: true,
          allow_chat: allowChat,
          show_variables: false,
          apply_variables: true
        },
        title: systemPrompt.name,
        initialMessage: allowInitialMessage ? undefined : '',
      });
      setModalOpen(true);
      setExecutingId(null);
    } catch (error) {
      console.error('Error executing button action:', error);
      setExecutingId(null);
    }
  };

  if (loading) {
    return (
      <div className={cn('flex gap-2', className)}>
        <Button disabled>
          <Loader2 className="h-4 w-4 animate-spin" />
        </Button>
      </div>
    );
  }

  if (systemPrompts.length === 0) {
    return null;
  }

  const containerClass = cn(
    renderAs === 'inline' && 'flex items-center gap-2',
    renderAs === 'grid' && 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2',
    renderAs === 'stack' && 'flex flex-col gap-2',
    className
  );

  return (
    <>
      <div className={containerClass}>
        {systemPrompts.map((systemPrompt) => {
          const isPlaceholder = systemPrompt.prompt_snapshot?.placeholder;
          const isExecutingThis = executingId === systemPrompt.id;
          const settings = systemPrompt.placement_settings || {};
          const variant = settings.variant || 'outline';
          const size = settings.size || 'sm';
          const showIcon = settings.showIcon ?? true;

          return (
            <Button
              key={systemPrompt.id}
              variant={variant as any}
              size={size as any}
              onClick={() => handleButtonClick(systemPrompt)}
              disabled={isPlaceholder || isExecutingThis}
              className={cn(
                'relative',
                isPlaceholder && 'opacity-60'
              )}
            >
              {isExecutingThis && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isPlaceholder && !isExecutingThis && <Lock className="h-4 w-4 mr-2" />}
              {showIcon && !isExecutingThis && !isPlaceholder && systemPrompt.display_config?.icon && (
                <span className="mr-2">{/* Icon placeholder */}</span>
              )}
              <span>{systemPrompt.name}</span>
              {isPlaceholder && (
                <Badge variant="outline" className="ml-2 text-xs">
                  Soon
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* Modal for execution */}
      {modalOpen && modalConfig && (
        <PromptRunnerModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          promptData={modalConfig.promptData}
          variables={modalConfig.variables}
          executionConfig={modalConfig.executionConfig}
          title={modalConfig.title}
          initialMessage={modalConfig.initialMessage}
        />
      )}
    </>
  );
}
