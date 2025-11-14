/**
 * SelectPromptModal
 * 
 * Modal for selecting or changing the AI prompt linked to a system prompt.
 * Shows compatible prompts with variable validation.
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Search,
  Link2,
  Clock,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { SystemPromptDB } from '@/types/system-prompts-db';
import { GeneratePromptForSystemModal } from './GeneratePromptForSystemModal';

interface SelectPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemPrompt: SystemPromptDB;
  onSuccess: () => void;
  mode: 'select' | 'change'; // select = no current prompt, change = has current prompt
}

interface CompatiblePrompt {
  id: string;
  name: string;
  description: string | null;
  variables: string[];
  updated_at: string;
  is_current: boolean;
  validation: {
    valid: boolean;
    missing: string[];
    extra: string[];
  };
}

interface AvailablePromptsResponse {
  prompts: CompatiblePrompt[];
  total: number;
  current_prompt_id: string | null;
}

export function SelectPromptModal({
  isOpen,
  onClose,
  systemPrompt,
  onSuccess,
  mode
}: SelectPromptModalProps) {
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [availablePrompts, setAvailablePrompts] = useState<CompatiblePrompt[]>([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // Fetch user's prompts (NEW SCHEMA - no compatibility check, admin chooses any prompt)
  useEffect(() => {
    if (!isOpen) return;

    async function fetchUserPrompts() {
      setLoading(true);
      setError('');
      
      try {
        // Fetch all user prompts
        const response = await fetch('/api/prompts?limit=1000');

        if (!response.ok) {
          throw new Error('Failed to fetch prompts');
        }

        const result = await response.json();
        
        // Map to CompatiblePrompt format
        const prompts: CompatiblePrompt[] = result.prompts.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          variables: p.variables || [],
          updated_at: p.updated_at,
          is_current: p.id === systemPrompt.source_prompt_id,
          validation: { valid: true, missing: [], extra: [] } // No validation in NEW schema
        }));

        setAvailablePrompts(prompts);
      } catch (err: any) {
        console.error('Error fetching prompts:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchUserPrompts();
  }, [isOpen, systemPrompt.source_prompt_id]);

  const handleSelectPrompt = async (promptId: string, promptName: string) => {
    setAssigning(true);
    setError('');

    try {
      const response = await fetch(
        `/api/system-prompts/${systemPrompt.id}/link-prompt`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt_id: promptId,
            update_notes: mode === 'select' 
              ? `Initial link to prompt: ${promptName}`
              : `Changed to use prompt: ${promptName}`
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // If validation failed, show detailed error
        if (errorData.validation) {
          const val = errorData.validation;
          let detailMsg = `Missing required variables:\n`;
          if (val.missing_variables?.length > 0) {
            detailMsg += `Missing: ${val.missing_variables.join(', ')}\n`;
          }
          detailMsg += `\nRequired: ${val.required_variables.join(', ')}`;
          detailMsg += `\nPrompt has: ${val.prompt_variables.join(', ')}`;
          if (val.extra_variables?.length > 0) {
            detailMsg += `\n\nNote: Extra variables are allowed (may have defaults): ${val.extra_variables.join(', ')}`;
          }
          throw new Error(detailMsg);
        }
        
        throw new Error(errorData.details || errorData.error || 'Failed to link prompt');
      }

      const result = await response.json();
      toast.success(result.message || 'Prompt linked successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error linking prompt:', err);
      setError(err.message);
      toast.error('Failed to link prompt');
    } finally {
      setAssigning(false);
    }
  };

  // Filter prompts based on search
  const filteredPrompts = availablePrompts.filter(prompt => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      prompt.name.toLowerCase().includes(query) ||
      prompt.description?.toLowerCase().includes(query) ||
      prompt.variables.some(v => v.toLowerCase().includes(query))
    );
  });

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle>
                {mode === 'select' ? 'Select' : 'Change'} AI Prompt for "{systemPrompt.label}"
              </DialogTitle>
              <DialogDescription>
                Choose an AI prompt to power this system prompt.
                {systemPrompt.category && (
                  <span className="block mt-1 text-xs">
                    Category: <strong>{systemPrompt.category.label}</strong> | 
                    Placement: <strong>{systemPrompt.category.placement_type}</strong>
                  </span>
                )}
              </DialogDescription>
            </div>
            <Button
              onClick={() => setShowGenerateModal(true)}
              className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white mr-6"
              size="sm"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate New
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {/* System Prompt Info */}
            {systemPrompt.category && (
              <Card className="p-3 bg-muted/50">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">System Prompt:</span>
                    <span className="ml-2">{systemPrompt.label}</span>
                  </div>
                  <div>
                    <span className="font-medium">Category:</span>
                    <span className="ml-2">{systemPrompt.category.label}</span>
                  </div>
                  <div>
                    <span className="font-medium">Placement:</span>
                    <span className="ml-2">{systemPrompt.category.placement_type}</span>
                  </div>
                  {systemPrompt.description && (
                    <div>
                      <span className="font-medium">Description:</span>
                      <span className="ml-2 text-muted-foreground">{systemPrompt.description}</span>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search prompts by name, description, or variables..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">{filteredPrompts.length}</span> {searchQuery ? 'matching' : 'available'} prompts
              </div>
              <div>
                <span className="font-medium text-foreground">{availablePrompts.length}</span> total prompts
              </div>
            </div>

            {/* Prompt List */}
            <ScrollArea className="h-[400px] pr-4">
              {filteredPrompts.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">
                    {searchQuery ? 'No prompts match your search' : 'No compatible prompts found'}
                  </p>
                {!searchQuery && (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create a new AI prompt for this system prompt
                    </p>
                    <Button
                      onClick={() => setShowGenerateModal(true)}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate New Prompt with AI
                    </Button>
                  </>
                )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredPrompts.map((prompt) => (
                    <Card
                      key={prompt.id}
                      className={cn(
                        'p-4 transition-all cursor-pointer',
                        prompt.is_current 
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50'
                      )}
                      onClick={() => !assigning && !prompt.is_current && handleSelectPrompt(prompt.id, prompt.name)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm">{prompt.name}</h4>
                            {prompt.is_current && (
                              <Badge variant="default" className="text-xs">
                                <Link2 className="h-3 w-3 mr-1" />
                                Current
                              </Badge>
                            )}
                          </div>
                          
                          {prompt.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                              {prompt.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-2">
                            {/* Variables */}
                            <div className="flex flex-wrap gap-1">
                              {prompt.variables.map(v => (
                                <Badge key={v} variant="outline" className="text-[10px] px-1.5 py-0">
                                  {v}
                                </Badge>
                              ))}
                            </div>
                            
                            {/* Updated time */}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {new Date(prompt.updated_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex-shrink-0">
                          {prompt.is_current ? (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          ) : (
                            <Button 
                              size="sm" 
                              disabled={assigning}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectPrompt(prompt.id, prompt.name);
                              }}
                            >
                              {assigning ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                'Select'
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* AI Prompt Generator Modal */}
    {showGenerateModal && (
      <GeneratePromptForSystemModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        systemPrompt={systemPrompt}
        onSuccess={(promptId) => {
          setShowGenerateModal(false);
          toast.success('Prompt generated and linked successfully!');
          onSuccess();
          onClose();
        }}
      />
    )}
    </>
  );
}

