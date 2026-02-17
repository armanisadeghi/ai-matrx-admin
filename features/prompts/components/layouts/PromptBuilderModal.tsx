/**
 * Prompt Builder Modal Component
 * 
 * Provides a selection of builder tools for creating prompts without AI generation
 */

"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Wrench, Zap, ArrowLeft, Layout, Sliders } from 'lucide-react';
import InstantChatAssistantComponent from '../builder/InstantChatAssistant';
import TabBasedPromptBuilder from '../builder/TabBasedPromptBuilder';
import AICustomizerPromptBuilder from '../builder/AICustomizerPromptBuilder';

interface PromptBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type BuilderOption = 'instant-chat-assistant' | 'tab-based-builder' | 'ai-customizer';

export function PromptBuilderModal({
  isOpen,
  onClose,
}: PromptBuilderModalProps) {
  const [selectedBuilder, setSelectedBuilder] = useState<BuilderOption | null>(null);

  const handleClose = () => {
    setSelectedBuilder(null);
    onClose();
  };

  const handleBack = () => {
    setSelectedBuilder(null);
  };

  // If a builder is selected, show it
  if (selectedBuilder) {
    const builderConfig = {
      'instant-chat-assistant': {
        icon: Zap,
        title: 'Instant Chat Assistant Builder',
        description: 'Configure your chat assistant with custom characteristics and behavior',
        component: <InstantChatAssistantComponent onClose={handleClose} />
      },
      'tab-based-builder': {
        icon: Layout,
        title: 'Comprehensive Tab-Based Builder',
        description: 'Build prompts using multiple tabs for different aspects',
        component: <TabBasedPromptBuilder onClose={handleClose} />
      },
      'ai-customizer': {
        icon: Sliders,
        title: 'AI Experience Customizer',
        description: 'Customize your AI\'s personality, capabilities, and preferences',
        component: <AICustomizerPromptBuilder onClose={handleClose} />
      }
    };

    const config = builderConfig[selectedBuilder];
    const Icon = config.icon;

    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-[95vw] h-[90dvh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-3 py-2 border-b flex-shrink-0">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="h-7 w-7 p-0"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
              <DialogTitle className="flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                {config.title}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {config.component}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show builder options list
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-green-600 dark:text-green-400" />
            Build a Prompt
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <Card 
            className="p-4 cursor-pointer hover:bg-accent/50 transition-colors border-2 hover:border-primary"
            onClick={() => setSelectedBuilder('instant-chat-assistant')}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex-shrink-0">
                <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold mb-1">Instant Chat Assistant</h3>
                <p className="text-sm text-muted-foreground">
                  Build a custom chat assistant by selecting key options.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                    No AI needed
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                    Instant creation
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Tab-Based Builder */}
          <Card 
            className="p-4 cursor-pointer hover:bg-accent/50 transition-colors border-2 hover:border-primary"
            onClick={() => setSelectedBuilder('tab-based-builder')}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                <Layout className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold mb-1">Comprehensive Builder</h3>
                <p className="text-sm text-muted-foreground">
                  Build advanced prompts using many different options.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    Advanced
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                    Detailed
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* AI Customizer */}
          <Card 
            className="p-4 cursor-pointer hover:bg-accent/50 transition-colors border-2 hover:border-primary"
            onClick={() => setSelectedBuilder('ai-customizer')}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex-shrink-0">
                <Sliders className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold mb-1">AI Experience Customizer</h3>
                <p className="text-sm text-muted-foreground">
                  Customize your AI's personality through an intuitive interface.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                    Interactive
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                    User-friendly
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

