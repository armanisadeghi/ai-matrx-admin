import React, { useRef } from 'react';
import { Label } from '@/components/ui/label';
import { VoiceTextarea } from '@/components/official/VoiceTextarea';
import { toast } from 'sonner';

interface TextareaInputProps {
  value: string;
  onChange: (value: string) => void;
  variableName: string;
  onRequestClose?: () => void;
}

/**
 * Textarea Input - Multi-line text input with voice input capability
 * Protection against accidental transcription loss is built-in
 */
export function TextareaInput({ 
  value, 
  onChange, 
  variableName,
  onRequestClose
}: TextareaInputProps) {
  const hasSelectedRef = useRef(false);

  // Select all text on first focus (works with autoFocus)
  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (!hasSelectedRef.current && e.target.value) {
      e.target.select();
      hasSelectedRef.current = true;
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {variableName}
      </Label>
      <VoiceTextarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        placeholder={`Enter ${variableName.toLowerCase()}... (hover for voice input)`}
        className="min-h-[200px] text-sm"
        autoFocus
        appendTranscript={true}
        onRequestClose={onRequestClose}
        protectTranscription={true}
        onTranscriptionComplete={(text) => {
          toast.success('Voice input added');
        }}
        onTranscriptionError={(error) => {
          toast.error('Voice input failed', {
            description: error,
          });
        }}
      />
    </div>
  );
}

