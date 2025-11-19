/**
 * BuiltinFormFields
 * 
 * Reusable form fields component for creating and editing prompt builtins.
 * Focuses on basic metadata (name, description).
 * Complex fields like messages, variables, and settings are edited through dedicated interfaces.
 */

'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, FileText, Sparkles } from 'lucide-react';
import type { CreatePromptBuiltinInput } from '../types/core';

interface BuiltinFormFieldsProps {
  formData: CreatePromptBuiltinInput;
  onChange: (updates: Partial<CreatePromptBuiltinInput>) => void;
  compact?: boolean;
  showSourceInfo?: boolean;
}

export function BuiltinFormFields({
  formData,
  onChange,
  compact = false,
  showSourceInfo = false,
}: BuiltinFormFieldsProps) {
  
  const labelClass = compact ? 'text-xs font-medium' : 'text-sm font-medium';
  const inputClass = compact ? 'h-8 text-xs' : 'h-9';

  const variableCount = formData.variableDefaults?.length || 0;
  const messageCount = formData.messages?.length || 0;

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="builtin-name" className={labelClass}>
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="builtin-name"
          value={formData.name || ''}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Builtin name"
          className={inputClass}
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="builtin-description" className={labelClass}>
          Description
        </Label>
        <Textarea
          id="builtin-description"
          value={formData.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Optional description"
          rows={compact ? 2 : 3}
          className={compact ? 'text-xs resize-none' : 'resize-none'}
        />
      </div>

      {/* Info Section */}
      <div className={`p-3 bg-muted/30 rounded-md space-y-2 ${compact ? 'text-xs' : 'text-sm'}`}>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-muted-foreground">Builtin Details</span>
        </div>
        
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Variables:</span>
            <Badge variant="secondary" className={compact ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'}>
              {variableCount} variable{variableCount !== 1 ? 's' : ''}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Messages:</span>
            <Badge variant="secondary" className={compact ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'}>
              {messageCount} message{messageCount !== 1 ? 's' : ''}
            </Badge>
          </div>

          {showSourceInfo && formData.id && (
            <div className="flex items-center justify-between pt-1 border-t">
              <span className="text-muted-foreground">Source:</span>
              <Badge 
                variant="outline" 
                className={compact ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'}
              >
                {(formData as any).source_prompt_id ? (
                  <>
                    <FileText className="h-2.5 w-2.5 mr-1" />
                    Converted
                  </>
                ) : (
                  <>
                    <Sparkles className="h-2.5 w-2.5 mr-1" />
                    Generated
                  </>
                )}
              </Badge>
            </div>
          )}
        </div>

        <p className={`text-muted-foreground italic ${compact ? 'text-[10px]' : 'text-xs'}`}>
          Messages, variables, and settings are edited through the builtin editor interface
        </p>
      </div>
    </div>
  );
}

