'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileAudio, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useTranscriptsContext } from '../context/TranscriptsContext';
import { useAudioTranscription } from '@/features/audio/hooks/useAudioTranscription';
import { useToastManager } from '@/hooks/useToastManager';
import { FileUploadWithStorage, UploadedFileResult } from '@/components/ui/file-upload/FileUploadWithStorage';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface CreateTranscriptModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Step = 'upload' | 'details' | 'process';

const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function CreateTranscriptModal({
    isOpen,
    onClose,
}: CreateTranscriptModalProps) {
    const { createTranscript } = useTranscriptsContext();
    const { transcribe, isTranscribing, error: transcribeError, result: transcriptionResult, reset: resetTranscription } = useAudioTranscription();
    const toast = useToastManager('transcripts');

    const [step, setStep] = useState<Step>('upload');
    const [uploadedFile, setUploadedFile] = useState<UploadedFileResult | null>(null);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [folder, setFolder] = useState('Transcripts');
    const [sourceType, setSourceType] = useState<'audio' | 'video' | 'meeting' | 'interview' | 'other'>('audio');
    const [isSaving, setIsSaving] = useState(false);

    // Reset when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            // Delay reset to allow animation to finish
            const timer = setTimeout(() => {
                setStep('upload');
                setUploadedFile(null);
                setTitle('');
                setDescription('');
                setFolder('Transcripts');
                setSourceType('audio');
                setIsSaving(false);
                resetTranscription();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen, resetTranscription]);

    const handleUploadComplete = (results: UploadedFileResult[]) => {
        if (results.length > 0) {
            const file = results[0];
            setUploadedFile(file);

            // Auto-populate title if empty
            if (!title && file.details?.filename) {
                // Remove extension
                const name = file.details.filename.replace(/\.[^/.]+$/, "");
                setTitle(name.charAt(0).toUpperCase() + name.slice(1));
            }

            // Move to details step
            setStep('details');
        }
    };

    const handleStartProcessing = async () => {
        if (!uploadedFile) return;

        setStep('process');

        try {
            // 1. We need to get the file blob to send to Groq
            // Since we just uploaded it, we might not have the blob directly accessible from the result
            // We have the URL. If it's private, we might need a signed URL, but let's try fetching it.
            // CAUTION: If the bucket is private, standard fetch might fail without auth headers or signed URL.
            // However, useAudioTranscription expects a Blob.
            // Option 2: Ask the user to re-select for transcription? No, bad UX.
            // Option 3: Fetch the file content from Supabase storage using the path.

            // Since we are in the browser and just uploaded it, we don't have the File object persisted unless we stored it in state in the parent?
            // FileUploadWithStorage doesn't seem to pass back the File object, only the result.
            // We need to fetch it.

            // NOTE: For now, I'll attempt to fetch using the url provided.
            // If that fails due to CORS/Auth, we might need to modify FileUploadWithStorage to return the File object or handle it differently.
            // Actually, we can just use the path to download it via Supabase client if needed, but let's try the URL first.

            let audioBlob: Blob;

            // Check if we have a public URL or need to download via supabase
            if (uploadedFile.url) {
                const response = await fetch(uploadedFile.url);
                if (!response.ok) throw new Error('Failed to download audio for transcription');
                audioBlob = await response.blob();
            } else {
                throw new Error("No file URL available");
            }

            // 2. Transcribe
            const result = await transcribe(audioBlob);

            if (!result.success || !result.text) {
                throw new Error(result.error || 'Transcription failed to produce text');
            }

            // 3. Save to DB
            await createTranscript({
                title: title.trim() || 'Untitled Transcript',
                description: description.trim(),
                segments: (result.segments || []).map((s: any) => ({
                    id: s.id?.toString() || crypto.randomUUID(),
                    timecode: formatTime(s.start || 0),
                    seconds: s.start || 0,
                    text: s.text || '',
                    speaker: 'Unknown'
                })),
                folder_name: folder,
                source_type: sourceType,
                tags: [],
                metadata: {
                    duration: result.duration,
                    language: result.language
                },
                audio_file_path: uploadedFile.details?.path
                    ? `${uploadedFile.details.path}/${uploadedFile.details.filename}`
                    : uploadedFile.details?.filename || null,
            });

            toast.success('Transcript created successfully');
            onClose();

        } catch (error: any) {
            console.error('Processing failed:', error);
            toast.error(error.message || 'Failed to process transcript');
            // Go back to details so they can try again or save without transcription?
            // Staying on process step allows viewing the error.
        }
    };

    const handleSaveWithoutTranscription = async () => {
        if (!uploadedFile) return;
        setIsSaving(true);
        try {
            await createTranscript({
                title: title.trim() || 'Untitled Transcript',
                description: description.trim(),
                segments: [], // Empty segments
                folder_name: folder,
                source_type: sourceType,
                tags: [],
                audio_file_path: uploadedFile.details?.path
                    ? `${uploadedFile.details.path}/${uploadedFile.details.filename}`
                    : uploadedFile.details?.filename || null,
            });
            toast.success('Transcript saved (without transcription)');
            onClose();
        } catch (error: any) {
            console.error('Save failed:', error);
            toast.error('Failed to save transcript');
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileAudio className="h-5 w-5" />
                        Create New Transcript
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    {/* Step 1: Upload */}
                    {step === 'upload' && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500 text-center mb-4">
                                Upload an audio or video file to get started.
                                <br />Supported formats: MP3, WAV, M4A, MP4.
                            </p>

                            <FileUploadWithStorage
                                bucket="user-private-assets"
                                path="transcripts"
                                saveTo="private"
                                onUploadComplete={handleUploadComplete}
                                multiple={false}
                                useMiniUploader={false}
                                maxHeight="250px"
                            />
                        </div>
                    )}

                    {/* Step 2: Details */}
                    {step === 'details' && (
                        <div className="space-y-4">
                            <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 mb-4">
                                <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <AlertTitle>File Uploaded</AlertTitle>
                                <AlertDescription className="text-blue-800 dark:text-blue-300 text-xs">
                                    {uploadedFile?.details?.filename} ({(uploadedFile?.details?.size || 0) / 1024 < 1024 ? `${Math.round((uploadedFile?.details?.size || 0) / 1024)} KB` : `${((uploadedFile?.details?.size || 0) / 1024 / 1024).toFixed(1)} MB`})
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Transcript Title"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Add a description..."
                                    rows={2}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="source-type">Source Type</Label>
                                    <Select value={sourceType} onValueChange={(v: any) => setSourceType(v)}>
                                        <SelectTrigger id="source-type">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="audio">Audio Recording</SelectItem>
                                            <SelectItem value="video">Video Recording</SelectItem>
                                            <SelectItem value="meeting">Meeting</SelectItem>
                                            <SelectItem value="interview">Interview</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="folder">Folder</Label>
                                    <Input
                                        id="folder"
                                        value={folder}
                                        onChange={(e) => setFolder(e.target.value)}
                                        placeholder="Folder Name"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Processing */}
                    {step === 'process' && (
                        <div className="flex flex-col items-center justify-center py-8 space-y-6">
                            {transcribeError ? (
                                <div className="text-center space-y-4 max-w-md mx-auto">
                                    <div className="h-16 w-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto text-red-600 dark:text-red-400">
                                        <AlertTriangle className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Transcription Failed</h3>
                                        <p className="text-sm text-gray-500 mt-2">{transcribeError}</p>
                                    </div>
                                    <Button variant="outline" onClick={() => setStep('details')}>
                                        Go Back
                                    </Button>
                                    <Button variant="default" onClick={handleSaveWithoutTranscription} disabled={isSaving}>
                                        {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                        Save Without Transcription
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className="relative">
                                        <div className="h-24 w-24 rounded-full border-4 border-t-blue-500 border-blue-200 dark:border-blue-900 animate-spin"></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Loader2 className="h-8 w-8 text-blue-500" />
                                        </div>
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h3 className="text-lg font-medium">Transcribing Audio...</h3>
                                        <p className="text-sm text-gray-500">
                                            Using Groq Whisper Large V3 Turbo for lightning fast results.
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    {step === 'upload' && (
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    )}
                    {step === 'details' && (
                        <>
                            <Button variant="ghost" onClick={() => setStep('upload')}>Back</Button>
                            <Button variant="outline" onClick={handleSaveWithoutTranscription} disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Draft
                            </Button>
                            <Button onClick={handleStartProcessing}>
                                Transcribe & Save
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
