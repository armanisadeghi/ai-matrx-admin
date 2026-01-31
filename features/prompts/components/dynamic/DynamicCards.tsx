/**
 * DynamicCards
 * 
 * Database-driven card grid that loads system prompts configured as cards.
 * Shows "Coming Soon" for placeholders.
 */

'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCardPrompts } from '@/hooks/useSystemPrompts';
import { PromptExecutionCard } from '@/features/prompts';
import { Loader2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DynamicCardsProps {
  category?: string;
  context?: string;
  renderAs?: 'grid' | 'list';
  className?: string;
  emptyMessage?: string;
}

export function DynamicCards({
  category,
  context = '',
  renderAs = 'grid',
  className,
  emptyMessage = 'No cards available',
}: DynamicCardsProps) {
  const { systemPrompts, loading } = useCardPrompts(category);

  if (loading) {
    return (
      <div
        className={cn(
          renderAs === 'grid'
            ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'
            : 'flex flex-col gap-4',
          className
        )}
      >
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6 h-48 animate-pulse bg-muted/50" />
        ))}
      </div>
    );
  }

  if (systemPrompts.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </Card>
    );
  }

  return (
    <div
      className={cn(
        renderAs === 'grid'
          ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'
          : 'flex flex-col gap-4',
        className
      )}
    >
      {systemPrompts.map((systemPrompt) => {
        const isPlaceholder = systemPrompt.prompt_snapshot?.placeholder;
        const allowChat = systemPrompt.placement_settings?.allowChat ?? true;
        const allowInitialMessage = systemPrompt.placement_settings?.allowInitialMessage ?? false;

        // If placeholder, show locked card
        if (isPlaceholder) {
          return (
            <Card
              key={systemPrompt.id}
              className="relative flex flex-col h-full p-6 opacity-60 cursor-not-allowed"
            >
              <div className="absolute top-4 right-4">
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 flex flex-col justify-center items-center text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {systemPrompt.name}
                </h3>
                {systemPrompt.description && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {systemPrompt.description}
                  </p>
                )}
                <Badge variant="outline" className="text-xs">
                  Coming Soon
                </Badge>
              </div>
            </Card>
          );
        }

        // Real card with actual prompt
        // Use source_prompt_id if available, otherwise use the prompt_snapshot itself
        return (
          <PromptExecutionCard
            key={systemPrompt.id}
            systemPromptId={systemPrompt.source_prompt_id || systemPrompt.id}
            systemPrompt={systemPrompt}
            title={systemPrompt.display_config?.label || systemPrompt.name}
            description={systemPrompt.description || ''}
            context={context}
            {/* @ts-ignore - allowInitialMessage prop may not exist in PromptExecutionCardProps */}
            allowInitialMessage={allowInitialMessage}
            allowChat={allowChat}
          />
        );
      })}
    </div>
  );
}

