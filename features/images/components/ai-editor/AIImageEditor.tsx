'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import { Wand2, RotateCcw, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ImageRecord, ImageSurface } from '../../types';

const AI_MODELS = [
  { id: 'flux-kontext', label: 'Flux Kontext' },
  { id: 'dall-e-3', label: 'DALL·E 3' },
  { id: 'stability-sd3', label: 'Stable Diffusion 3' },
  { id: 'imagen-3', label: 'Imagen 3' },
];

interface AIImageEditorProps {
  image?: ImageRecord | null;
  surface?: ImageSurface;
  className?: string;
}

export function AIImageEditor({ image, surface = 'page', className }: AIImageEditorProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0].id);
  const [result, setResult] = useState<string | null>(null);

  const handleApply = () => {
    toast.info('AI editing backend not yet connected');
  };

  const handleReset = () => {
    setResult(null);
    setPrompt('');
  };

  const compact = surface === 'panel';

  return (
    <div className={cn('flex flex-col h-full gap-4 p-4 overflow-y-auto', className)}>
      <div className={cn('grid gap-3', compact ? 'grid-cols-1' : 'grid-cols-2')}>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Original</p>
          <div className="aspect-video rounded-md bg-muted flex items-center justify-center overflow-hidden border border-border">
            {image ? (
              <Image
                src={image.url}
                alt="Original"
                width={400}
                height={225}
                className="w-full h-full object-contain"
                unoptimized
              />
            ) : (
              <p className="text-xs text-muted-foreground">No image selected</p>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Result</p>
          <div className="aspect-video rounded-md bg-muted flex items-center justify-center border border-dashed border-border overflow-hidden">
            {result ? (
              <Image src={result} alt="Result" width={400} height={225} className="w-full h-full object-contain" unoptimized />
            ) : (
              <p className="text-xs text-muted-foreground">Result will appear here</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Model</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
          >
            {AI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Describe the edit</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Remove the background and replace with a sunset…"
            rows={compact ? 2 : 4}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-auto">
        <button
          type="button"
          onClick={handleApply}
          disabled={!prompt.trim() || !image}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Wand2 className="w-3 h-3" />
          Apply
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
        {result && (
          <button
            type="button"
            onClick={() => toast.info('Save backend not yet connected')}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground ml-auto"
          >
            <Save className="w-3 h-3" />
            Save to Cloud
          </button>
        )}
      </div>
    </div>
  );
}
