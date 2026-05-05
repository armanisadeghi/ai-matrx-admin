'use client';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { Upload, ImageIcon, Clipboard, ZoomIn, Download, CloudUpload, RotateCcw, Loader2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { getCroppedImg } from '@/components/official/image-cropper/cropImage';
import { cn } from '@/lib/utils';
import { CloudFolders } from '@/features/files/utils/folder-conventions';

const ASPECT_RATIOS = [
  { label: 'Free', value: null },
  { label: '1 : 1', value: 1 },
  { label: '16 : 9', value: 16 / 9 },
  { label: '4 : 3', value: 4 / 3 },
  { label: '3 : 2', value: 3 / 2 },
  { label: '9 : 16', value: 9 / 16 },
  { label: '2 : 3', value: 2 / 3 },
];

export function ImageCropWorkspace() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<number | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const [croppedUrl, setCroppedUrl] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    if (croppedUrl) URL.revokeObjectURL(croppedUrl);
    setImageUrl(URL.createObjectURL(file));
    setImageName(file.name);
    setCroppedUrl(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }, [imageUrl, croppedUrl]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  };

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith('image/'));
    const file = item?.getAsFile();
    if (file) loadFile(file);
  }, [loadFile]);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  // cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      if (croppedUrl) URL.revokeObjectURL(croppedUrl);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCropComplete = useCallback((_: unknown, pixels: { x: number; y: number; width: number; height: number }) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleCrop = async () => {
    if (!imageUrl || !croppedAreaPixels) return;
    setIsCropping(true);
    try {
      const blob = await getCroppedImg(imageUrl, croppedAreaPixels);
      if (!blob) throw new Error('Failed to generate cropped image');
      if (croppedUrl) URL.revokeObjectURL(croppedUrl);
      setCroppedUrl(URL.createObjectURL(blob));
    } catch {
      toast.error('Crop failed — try again');
    } finally {
      setIsCropping(false);
    }
  };

  const handleDownload = () => {
    if (!croppedUrl) return;
    const a = document.createElement('a');
    a.href = croppedUrl;
    a.download = `cropped-${imageName || 'image'}.jpg`;
    a.click();
  };

  const handleSaveToCloud = async () => {
    if (!croppedUrl) return;
    setIsSaving(true);
    try {
      const res = await fetch(croppedUrl);
      const blob = await res.blob();
      const file = new File([blob], `cropped-${imageName || 'image'}.jpg`, { type: 'image/jpeg' });
      const form = new FormData();
      form.append('file', file);
      form.append('folder', CloudFolders.IMAGES);
      form.append('visibility', 'private');
      const uploadRes = await fetch('/api/images/upload', { method: 'POST', body: form });
      if (!uploadRes.ok) throw new Error(await uploadRes.text());
      toast.success('Saved to your cloud library');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    if (croppedUrl) URL.revokeObjectURL(croppedUrl);
    setImageUrl(null);
    setImageName('');
    setCroppedUrl(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  // ── No image: hero drop zone ──────────────────────────────────────────────
  if (!imageUrl) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10">
        <input ref={fileInputRef} type="file" accept="image/*" className="sr-only" onChange={handleFileInput} />
        <div
          className={cn(
            'w-full max-w-xl min-h-[300px] max-h-[420px] flex-1 flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed transition-colors cursor-pointer',
            isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
          )}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon className="w-10 h-10 text-muted-foreground" />
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-foreground">Drop an image here to crop</p>
            <p className="text-xs text-muted-foreground">or paste from clipboard, or click to browse</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Upload className="w-3 h-3" />
              Choose Image
            </button>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clipboard className="w-3 h-3" />
              or Ctrl+V
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── Image loaded: crop workspace ──────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {/* File name + change image bar */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/30">
        <span className="text-xs text-muted-foreground truncate flex-1">{imageName}</span>
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Change image
        </button>
      </div>

      {/* Crop canvas + optional result panel */}
      <div className={cn('flex-1 flex min-h-0 overflow-hidden', croppedUrl && 'divide-x divide-border')}>
        {/* Crop canvas */}
        <div className="relative flex-1 min-w-0">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspect ?? undefined}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
            classes={{ containerClassName: 'bg-background' }}
          />
        </div>

        {/* Result panel — appears after cropping */}
        {croppedUrl && (
          <div className="w-64 shrink-0 flex flex-col bg-card overflow-y-auto">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-semibold text-foreground">Result</p>
              <p className="text-xs text-muted-foreground mt-0.5">Adjust and crop again to update</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="rounded-lg border border-border overflow-hidden bg-muted/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={croppedUrl} alt="Cropped result" className="w-full h-auto" />
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 rounded-md border border-border bg-muted hover:bg-accent px-3 py-2 text-xs font-medium text-foreground transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
              <button
                type="button"
                onClick={handleSaveToCloud}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 rounded-md bg-primary hover:bg-primary/90 px-3 py-2 text-xs font-medium text-primary-foreground transition-colors disabled:opacity-60"
              >
                {isSaving
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <CloudUpload className="w-3.5 h-3.5" />
                }
                Save to Cloud
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="shrink-0 flex items-center gap-4 px-4 py-3 border-t border-border bg-card">
        {/* Aspect ratio chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {ASPECT_RATIOS.map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => setAspect(r.value)}
              className={cn(
                'shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                aspect === r.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground border border-border',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Zoom slider */}
        <div className="flex items-center gap-2 flex-1 max-w-[220px]">
          <ZoomIn className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.1}
            onValueChange={([v]) => setZoom(v)}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-8 tabular-nums">{zoom.toFixed(1)}x</span>
        </div>

        {/* Crop button */}
        <button
          type="button"
          onClick={handleCrop}
          disabled={isCropping || !croppedAreaPixels}
          className="flex items-center gap-1.5 rounded-md bg-primary px-5 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {isCropping && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {isCropping ? 'Cropping...' : 'Crop'}
        </button>
      </div>
    </div>
  );
}
