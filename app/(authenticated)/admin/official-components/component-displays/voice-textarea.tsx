'use client';

import React, { useState } from 'react';
import { ComponentEntry } from '../parts/component-list';
import { ComponentDisplayWrapper } from '../component-usage';
import { VoiceTextarea } from '@/components/official/VoiceTextarea';
import { toast } from 'sonner';

interface ComponentDisplayProps {
  component?: ComponentEntry;
}

export default function VoiceTextareaDisplay({ component }: ComponentDisplayProps) {
  const [value, setValue] = useState('');

  if (!component) return null;
  
  // Example code with all available props and their default values
  const code = `import { VoiceTextarea } from '@/components/official/VoiceTextarea';
import { toast } from 'sonner';

const [value, setValue] = useState('');

<VoiceTextarea
  value={value}
  onChange={(e) => setValue(e.target.value)}
  placeholder="Start typing or use voice input..."
  className="min-h-[150px]"
  
  // Voice & Transcription props
  onTranscriptionComplete={(text) => {
    toast.success('Voice input added');
  }}
  onTranscriptionError={(error) => {
    toast.error('Voice input failed', {
      description: error,
    });
  }}
  appendTranscript={true}          // If true, appends to existing text; if false, replaces (default: true)
  
  // Auto-grow props
  autoGrow={false}                 // Enable auto-grow height (default: false)
  minHeight={150}                  // Minimum height in pixels
  maxHeight={400}                  // Maximum height in pixels
  
  // Styling
  wrapperClassName=""              // Additional classes for the wrapper div
  
  // Standard textarea props
  disabled={false}
  rows={5}
  // ...all other standard textarea props are supported
/>`;

  return (
    <ComponentDisplayWrapper
      component={component}
      code={code}
      description="Textarea with built-in voice recording and copy functionality. Icons appear on hover/focus for a clean interface. Handles recording, transcription, and text insertion automatically."
    >
      <div className="w-full max-w-2xl space-y-4">
        <VoiceTextarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Start typing or use voice input... (hover or click to see controls)"
          className="min-h-[150px]"
          onTranscriptionComplete={(text) => {
            toast.success('Voice input added', {
              description: `Added: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
            });
          }}
          onTranscriptionError={(error) => {
            toast.error('Voice input failed', {
              description: error,
            });
          }}
        />
        
        {value && (
          <div className="text-sm text-muted-foreground">
            <strong>Preview:</strong> {value.substring(0, 100)}{value.length > 100 ? '...' : ''}
          </div>
        )}
      </div>
    </ComponentDisplayWrapper>
  );
}

