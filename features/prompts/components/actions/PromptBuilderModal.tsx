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
import { Wrench, Zap, ArrowLeft } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import the InstantChatAssistant to avoid SSR issues
const InstantChatAssistantComponent = dynamic(
  () => import('../builder/InstantChatAssistant'),
  { ssr: false }
);

interface PromptBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type BuilderOption = 'instant-chat-assistant';

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
  if (selectedBuilder === 'instant-chat-assistant') {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-7xl h-[95vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="h-8 w-8 p-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <DialogTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  Instant Chat Assistant Builder
                </DialogTitle>
                <DialogDescription>
                  Configure your chat assistant with custom characteristics and behavior
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            <InstantChatAssistantComponent onClose={handleClose} />
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
          <DialogDescription>
            Choose a builder tool to create your prompt with a guided interface
          </DialogDescription>
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
                  Build a custom chat assistant by selecting language, persona, tone, cognitive approach, 
                  and fine-tuning complexity, creativity, and conciseness levels.
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

          {/* Placeholder for future builders */}
          <Card className="p-4 opacity-50">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg flex-shrink-0">
                <Wrench className="h-6 w-6 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold mb-1 text-muted-foreground">More Builders Coming Soon</h3>
                <p className="text-sm text-muted-foreground">
                  Additional prompt builders will be added here in future updates.
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

