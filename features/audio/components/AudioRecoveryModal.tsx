/**
 * Audio Recovery Modal
 *
 * Full modal showing recovered audio recordings with options to
 * play, download, copy text, re-transcribe, or dismiss each item.
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Download, Copy, Check, Trash2, RotateCcw, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAudioRecovery } from '../providers/AudioRecoveryProvider';
import { SafetyRecord } from '../services/audioSafetyStore';
import { uploadAndTranscribeFull } from '../services/audioFallbackUpload';

interface RecoveryItemProps {
  item: SafetyRecord;
  onDismiss: (id: string) => void;
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(chunks: ArrayBuffer[], bytesPerSecond: number = 16000): string {
  const totalBytes = chunks.reduce((sum, c) => sum + c.byteLength, 0);
  const seconds = Math.round(totalBytes / bytesPerSecond);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `~${m}:${String(s).padStart(2, '0')}`;
}

function RecoveryItem({ item, onDismiss }: RecoveryItemProps) {
  const { getAudioBlob } = useAudioRecovery();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isRetranscribing, setIsRetranscribing] = useState(false);
  const [localText, setLocalText] = useState(item.accumulatedText);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let url: string | null = null;
    (async () => {
      const blob = await getAudioBlob(item.id);
      if (blob) {
        url = URL.createObjectURL(blob);
        setAudioUrl(url);
      }
    })();
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [item.id, getAudioBlob]);

  const handleCopyText = async () => {
    if (!localText) return;
    await navigator.clipboard.writeText(localText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = async () => {
    const blob = await getAudioBlob(item.id);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recovered-audio-${item.id}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRetranscribe = async () => {
    const blob = await getAudioBlob(item.id);
    if (!blob) return;
    setIsRetranscribing(true);
    try {
      const result = await uploadAndTranscribeFull(blob, 'recovery');
      if (result.success && result.text) {
        setLocalText(result.text);
      }
    } finally {
      setIsRetranscribing(false);
    }
  };

  const hasAudio = item.audioChunks.length > 0;
  const hasText = localText.trim().length > 0;

  return (
    <div className="border border-border rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(item.createdAt)}
          </span>
          {hasAudio && (
            <span className="text-xs text-muted-foreground">
              {formatDuration(item.audioChunks)}
            </span>
          )}
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
            item.status === 'failed' ? 'bg-destructive/10 text-destructive' :
            item.status === 'recording' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
            'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
          )}>
            {item.status}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDismiss(item.id)}
          className="h-7 w-7 p-0"
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>

      {audioUrl && (
        <audio ref={audioRef} controls src={audioUrl} className="w-full h-8" preload="metadata" />
      )}

      {hasText && (
        <div className="bg-muted/50 rounded-md p-2 max-h-24 overflow-y-auto">
          <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
            {localText}
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {hasText && (
          <Button variant="outline" size="sm" onClick={handleCopyText} className="h-7 text-xs gap-1.5">
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy Text'}
          </Button>
        )}
        {hasAudio && (
          <Button variant="outline" size="sm" onClick={handleDownload} className="h-7 text-xs gap-1.5">
            <Download className="h-3 w-3" />
            Download
          </Button>
        )}
        {hasAudio && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetranscribe}
            disabled={isRetranscribing}
            className="h-7 text-xs gap-1.5"
          >
            {isRetranscribing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
            Re-transcribe
          </Button>
        )}
      </div>
    </div>
  );
}

export interface AudioRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AudioRecoveryModal({ isOpen, onClose }: AudioRecoveryModalProps) {
  const { recoveredItems, dismissItem, dismissAll, hasRecoveredData } = useAudioRecovery();

  const handleDismissItem = async (id: string) => {
    await dismissItem(id);
    if (recoveredItems.length <= 1) {
      onClose();
    }
  };

  const handleDismissAll = async () => {
    await dismissAll();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Recovered Recordings
          </DialogTitle>
          <DialogDescription>
            These recordings were saved from a previous session. You can play them,
            download the audio, copy the text, or re-transcribe.
          </DialogDescription>
        </DialogHeader>

        {hasRecoveredData ? (
          <div className="space-y-3">
            {recoveredItems.map(item => (
              <RecoveryItem
                key={item.id}
                item={item}
                onDismiss={handleDismissItem}
              />
            ))}
            <div className="flex justify-end pt-2">
              <Button variant="ghost" size="sm" onClick={handleDismissAll} className="text-xs text-muted-foreground">
                Dismiss All
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">
            No recovered recordings found.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
