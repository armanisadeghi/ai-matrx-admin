'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Upload, Loader2, CheckCircle2, AlertCircle, ImageIcon, Video, X, Trash2 } from 'lucide-react';
import { useBackendApi } from '@/hooks/useBackendApi';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { UploadAssetsResponse } from '@/app/api/podcasts/upload-assets/route';

export interface AssetUrls {
    image_url: string | null;
    og_image_url: string | null;
    thumbnail_url: string | null;
    video_url: string | null;
}

interface AssetUploaderProps {
    /** Called whenever URLs change (upload or removal) */
    onComplete: (urls: AssetUrls) => void;
    /** Current URLs already set (to show existing previews) */
    currentImageUrl?: string | null;
    currentVideoUrl?: string | null;
    /** Whether to show the video upload section */
    showVideoUpload?: boolean;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

interface SectionState {
    state: UploadState;
    error: string | null;
    fileName: string | null;
}

const ACCEPT_IMAGE = '.jpg,.jpeg,.png,.webp,.gif,.heic';
const ACCEPT_VIDEO = '.mp4,.mov,.webm';

export function AssetUploader({ onComplete, currentImageUrl, currentVideoUrl, showVideoUpload = true }: AssetUploaderProps) {
    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const api = useBackendApi();

    const [imageSection, setImageSection] = useState<SectionState>({ state: 'idle', error: null, fileName: null });
    const [videoSection, setVideoSection] = useState<SectionState>({ state: 'idle', error: null, fileName: null });
    const [previews, setPreviews] = useState<AssetUrls>({
        image_url: currentImageUrl ?? null,
        og_image_url: null,
        thumbnail_url: null,
        video_url: currentVideoUrl ?? null,
    });

    // Sync preview state when the parent switches to a different episode/show
    useEffect(() => {
        setPreviews((prev) => ({
            ...prev,
            image_url: currentImageUrl ?? null,
            video_url: currentVideoUrl ?? null,
        }));
        setImageSection({ state: 'idle', error: null, fileName: null });
        setVideoSection({ state: 'idle', error: null, fileName: null });
    }, [currentImageUrl, currentVideoUrl]);

    // ── Image upload — goes through Next.js /api route (Sharp on server) ──
    const uploadImage = useCallback(async (file: File) => {
        setImageSection({ state: 'uploading', error: null, fileName: file.name });
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', 'image');

            const res = await fetch('/api/podcasts/upload-assets', { method: 'POST', body: formData });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error((body as { error?: string }).error ?? `Upload failed (${res.status})`);
            }
            const data = await res.json() as UploadAssetsResponse;

            const next: AssetUrls = {
                image_url: data.image_url ?? previews.image_url,
                og_image_url: data.og_image_url ?? previews.og_image_url,
                thumbnail_url: data.thumbnail_url ?? previews.thumbnail_url,
                video_url: previews.video_url,
            };
            setPreviews(next);
            onComplete(next);
            setImageSection({ state: 'success', error: null, fileName: file.name });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Upload failed';
            setImageSection({ state: 'error', error: message, fileName: file.name });
        }
    }, [previews, onComplete]);

    // ── Video upload — goes DIRECTLY to Python via useBackendApi ──
    // This respects the admin localhost/production toggle automatically.
    const uploadVideo = useCallback(async (file: File) => {
        setVideoSection({ state: 'uploading', error: null, fileName: file.name });
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await api.upload(ENDPOINTS.media.uploadPodcastVideo, formData);
            const data = await res.json() as UploadAssetsResponse;

            const next: AssetUrls = {
                image_url: data.image_url ?? previews.image_url,
                og_image_url: data.og_image_url ?? previews.og_image_url,
                thumbnail_url: data.thumbnail_url ?? previews.thumbnail_url,
                video_url: data.video_url ?? previews.video_url,
            };
            setPreviews(next);
            onComplete(next);
            setVideoSection({ state: 'success', error: null, fileName: file.name });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Upload failed';
            setVideoSection({ state: 'error', error: message, fileName: file.name });
        }
    }, [api, previews, onComplete]);

    // ── Remove handlers ───────────────────────────────────────────────────
    const removeImage = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        const next: AssetUrls = { ...previews, image_url: null, og_image_url: null, thumbnail_url: null };
        setPreviews(next);
        onComplete(next);
        setImageSection({ state: 'idle', error: null, fileName: null });
        if (imageInputRef.current) imageInputRef.current.value = '';
    }, [previews, onComplete]);

    const removeVideo = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        const next: AssetUrls = { ...previews, video_url: null };
        setPreviews(next);
        onComplete(next);
        setVideoSection({ state: 'idle', error: null, fileName: null });
        if (videoInputRef.current) videoInputRef.current.value = '';
    }, [previews, onComplete]);

    // ── Drag handlers ─────────────────────────────────────────────────────
    const handleImageDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file?.type.startsWith('image/')) uploadImage(file);
    }, [uploadImage]);

    const handleVideoDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file?.type.startsWith('video/')) uploadVideo(file);
    }, [uploadVideo]);

    const StatusIcon = ({ state }: { state: UploadState }) => {
        if (state === 'uploading') return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
        if (state === 'success') return <CheckCircle2 className="h-4 w-4 text-success" />;
        if (state === 'error') return <AlertCircle className="h-4 w-4 text-destructive" />;
        return null;
    };

    return (
        <div className="flex flex-col gap-4">

            {/* ── Image upload zone ──────────────────────────────────────── */}
            <div className="grid gap-2">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium flex items-center gap-1.5">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        Cover Image
                    </p>
                    <StatusIcon state={imageSection.state} />
                </div>

                <div
                    onDrop={handleImageDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => imageSection.state !== 'uploading' && imageInputRef.current?.click()}
                    className={`
                        relative border-2 border-dashed rounded-xl transition-colors
                        ${imageSection.state === 'uploading'
                            ? 'border-primary/40 bg-primary/5 cursor-not-allowed'
                            : 'border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer'}
                    `}
                >
                    <input
                        ref={imageInputRef}
                        type="file"
                        accept={ACCEPT_IMAGE}
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }}
                    />

                    {previews.image_url ? (
                        <div className="flex items-center gap-3 p-3">
                            <img
                                src={previews.thumbnail_url ?? previews.image_url}
                                alt="Cover"
                                className="w-14 h-14 rounded-lg object-cover border shrink-0"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            <div className="min-w-0 flex-1 text-sm">
                                {imageSection.state === 'success' && (
                                    <p className="text-success text-xs font-medium">Processed successfully</p>
                                )}
                                {imageSection.state === 'idle' && (
                                    <p className="text-xs text-muted-foreground font-medium">Image set</p>
                                )}
                                <p className="text-muted-foreground text-xs truncate">{imageSection.fileName ?? 'Previously uploaded'}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Click to replace</p>
                            </div>
                            {previews.og_image_url && (
                                <img
                                    src={previews.og_image_url}
                                    alt="OG"
                                    className="w-20 h-11 rounded object-cover border shrink-0"
                                    title="1200×630 OG image"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                            )}
                            {/* Remove button */}
                            <button
                                onClick={removeImage}
                                title="Remove image"
                                className="shrink-0 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-2 py-6">
                            {imageSection.state === 'uploading' ? (
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            ) : (
                                <Upload className="h-8 w-8 text-muted-foreground" />
                            )}
                            <div className="text-center">
                                <p className="text-sm font-medium text-foreground">
                                    {imageSection.state === 'uploading' ? 'Processing…' : 'Drop image or click to upload'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    JPG, PNG, WebP · Auto-generates 1400×1400, 1200×630, 400×400
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {imageSection.error && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {imageSection.error}
                    </p>
                )}

                {previews.image_url && (
                    <div className="flex gap-2 flex-wrap">
                        {[
                            { label: '1400×1400', url: previews.image_url,      title: 'Cover art' },
                            { label: '1200×630',  url: previews.og_image_url,   title: 'OG / Social' },
                            { label: '400×400',   url: previews.thumbnail_url,  title: 'Thumbnail' },
                        ].map(({ label, url, title }) => (
                            <span
                                key={label}
                                className={`text-xs px-2 py-0.5 rounded-full border ${url ? 'border-success/40 text-success bg-success/5' : 'border-muted text-muted-foreground'}`}
                                title={title}
                            >
                                {label} {url ? '✓' : '—'}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Video upload zone ──────────────────────────────────────── */}
            {showVideoUpload && (
                <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium flex items-center gap-1.5">
                            <Video className="h-4 w-4 text-muted-foreground" />
                            Background Video
                            <span className="text-xs text-muted-foreground font-normal">(for "with_video" mode)</span>
                        </p>
                        <StatusIcon state={videoSection.state} />
                    </div>

                    <div
                        onDrop={handleVideoDrop}
                        onDragOver={(e) => e.preventDefault()}
                        onClick={() => videoSection.state !== 'uploading' && videoInputRef.current?.click()}
                        className={`
                            relative border-2 border-dashed rounded-xl transition-colors
                            ${videoSection.state === 'uploading'
                                ? 'border-primary/40 bg-primary/5 cursor-not-allowed'
                                : 'border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer'}
                        `}
                    >
                        <input
                            ref={videoInputRef}
                            type="file"
                            accept={ACCEPT_VIDEO}
                            className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadVideo(f); }}
                        />

                        {previews.video_url ? (
                            <div className="flex items-center gap-3 p-3">
                                <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center border shrink-0">
                                    <Video className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div className="min-w-0 flex-1 text-sm">
                                    {videoSection.state === 'success' && (
                                        <p className="text-success text-xs font-medium">Uploaded successfully</p>
                                    )}
                                    {videoSection.state === 'idle' && (
                                        <p className="text-xs text-muted-foreground font-medium">Video set</p>
                                    )}
                                    <p className="text-muted-foreground text-xs truncate">{videoSection.fileName ?? 'Previously uploaded'}</p>
                                    {videoSection.state === 'success' && previews.image_url && (
                                        <p className="text-xs text-success mt-0.5">Cover image extracted from video</p>
                                    )}
                                    {videoSection.state === 'success' && !previews.image_url && (
                                        <p className="text-xs text-warning mt-0.5">Upload a cover image separately</p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-0.5">Click to replace</p>
                                </div>
                                {/* Remove button */}
                                <button
                                    onClick={removeVideo}
                                    title="Remove video"
                                    className="shrink-0 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 py-6">
                                {videoSection.state === 'uploading' ? (
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                ) : (
                                    <Video className="h-8 w-8 text-muted-foreground" />
                                )}
                                <div className="text-center">
                                    <p className="text-sm font-medium text-foreground">
                                        {videoSection.state === 'uploading' ? 'Uploading & processing…' : 'Drop video or click to upload'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        MP4, MOV, WebM · Portrait (1080×1920) recommended
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {videoSection.error && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> {videoSection.error}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
