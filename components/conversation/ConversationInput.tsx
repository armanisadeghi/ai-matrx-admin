'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowUp, CornerDownLeft, Mic, ChevronRight, MicOff, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { chatConversationsActions } from '@/lib/redux/chatConversations/slice';
import { sendMessage } from '@/lib/redux/chatConversations/thunks/sendMessage';
import {
    selectCurrentInput,
    selectResources,
    selectVariableDefaults,
    selectIsExecuting,
    selectExpandedVariable,
    selectShowVariables,
    selectUIState,
} from '@/lib/redux/chatConversations/selectors';
import { ResourceChips } from '@/features/prompts/components/resource-display';
import { useClipboardPaste } from '@/components/ui/file-upload/useClipboardPaste';
import { useFileUploadWithStorage } from '@/components/ui/file-upload/useFileUploadWithStorage';
import { useRecordAndTranscribe, TranscriptionLoader } from '@/features/audio';
import { toast } from 'sonner';
import type { Resource } from '@/features/prompts/types/resources';

// ============================================================================
// PROPS
// ============================================================================

export interface ConversationInputProps {
    sessionId: string;

    // ── Feature flags (all default off unless noted) ───────────────────────────
    showVariables?: boolean;
    showVoice?: boolean;          // default: true
    showResourcePicker?: boolean; // default: true
    showModelPicker?: boolean;
    showAgentPicker?: boolean;
    showSubmitOnEnterToggle?: boolean;
    showAutoClearToggle?: boolean;

    // ── Configuration ──────────────────────────────────────────────────────────
    variableMode?: 'guided' | 'classic';
    uploadBucket?: string;
    uploadPath?: string;
    sendButtonVariant?: 'gray' | 'blue' | 'default';
    seamless?: boolean;  // borderless style for embedded layouts
    placeholder?: string;
    compact?: boolean;
    showShiftEnterHint?: boolean;

    // ── Callbacks ──────────────────────────────────────────────────────────────
    onSend?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ConversationInput({
    sessionId,
    showVariables = false,
    showVoice = true,
    showResourcePicker = true,
    showModelPicker = false,
    showAgentPicker = false,
    showSubmitOnEnterToggle = false,
    showAutoClearToggle = false,
    variableMode = 'guided',
    uploadBucket = 'userContent',
    uploadPath = 'prompt-attachments',
    sendButtonVariant = 'blue',
    seamless = false,
    placeholder = 'Send a message...',
    compact = false,
    showShiftEnterHint = false,
    onSend,
}: ConversationInputProps) {
    const dispatch = useAppDispatch();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const pendingVoiceSubmitRef = useRef(false);
    const [submitOnEnter, setSubmitOnEnter] = useState(false);
    const [previewSheetOpen, setPreviewSheetOpen] = useState(false);
    const [previewResource, setPreviewResource] = useState<Resource | null>(null);

    // ── Redux state ────────────────────────────────────────────────────────────
    const content = useAppSelector((state) => selectCurrentInput(state, sessionId));
    const resources = useAppSelector((state) => selectResources(state, sessionId));
    const variableDefaults = useAppSelector((state) => selectVariableDefaults(state, sessionId));
    const isExecuting = useAppSelector((state) => selectIsExecuting(state, sessionId));
    const expandedVariable = useAppSelector((state) => selectExpandedVariable(state, sessionId));
    const showVarsInState = useAppSelector((state) => selectShowVariables(state, sessionId));
    const uiState = useAppSelector((state) => selectUIState(state, sessionId));

    const session = useAppSelector((state) => state.chatConversations.sessions[sessionId]);
    const agentId = session?.agentId ?? '';
    const conversationId = session?.conversationId ?? null;

    // ── File upload ────────────────────────────────────────────────────────────
    const { uploadFile, isLoading: isUploading } = useFileUploadWithStorage(uploadBucket, uploadPath);

    const handleFilesSelected = useCallback(async (files: FileList | File[]) => {
        const filesArray = Array.from(files);
        for (const file of filesArray) {
            try {
                const result = await uploadFile(file);
                if (!result) throw new Error('Upload returned no result');
                const resource: Resource = {
                    type: file.type.startsWith('image/') ? 'image_link' : 'file',
                    data: {
                        url: result.url,
                        filename: file.name,
                        mime_type: file.type,
                        size: file.size,
                    },
                } as unknown as Resource;
                dispatch(chatConversationsActions.addResource({ sessionId, resource }));
            } catch (err) {
                toast.error(`Failed to upload ${file.name}`);
            }
        }
    }, [dispatch, sessionId, uploadFile]);

    // ── Clipboard paste ────────────────────────────────────────────────────────
    useClipboardPaste({
        textareaRef,
        onPasteImage: async (file) => {
            await handleFilesSelected([file]);
        },
    });

    // ── Voice / transcribe ─────────────────────────────────────────────────────
    const {
        isRecording,
        isTranscribing,
        startRecording,
        stopRecording,
        error: recordError,
    } = useRecordAndTranscribe({
        onTranscriptionComplete: (result) => {
            if (!result.success || !result.text) return;
            const newContent = content ? `${content} ${result.text}` : result.text;
            dispatch(chatConversationsActions.setCurrentInput({ sessionId, input: newContent }));
            if (pendingVoiceSubmitRef.current) {
                pendingVoiceSubmitRef.current = false;
                handleSubmit(newContent);
            }
        },
        onError: (err) => toast.error('Transcription failed', { description: err }),
    });

    useEffect(() => {
        if (recordError) {
            toast.error('Microphone error', { description: recordError });
        }
    }, [recordError]);

    // ── Auto-resize textarea ───────────────────────────────────────────────────
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const scrollH = textareaRef.current.scrollHeight;
            const maxH = 200;
            textareaRef.current.style.height = `${Math.min(scrollH, maxH)}px`;
        }
    }, [content]);

    // ── Submit ─────────────────────────────────────────────────────────────────
    const handleSubmit = useCallback((overrideContent?: string) => {
        const finalContent = (overrideContent ?? content).trim();
        if (!finalContent || isExecuting || !agentId) return;

        // Build variables from variableDefaults
        const variables: Record<string, string> = {};
        variableDefaults.forEach(v => {
            if (v.defaultValue !== undefined && v.defaultValue !== null) {
                variables[v.name] = String(v.defaultValue);
            }
        });

        dispatch(sendMessage({
            sessionId,
            agentId,
            content: finalContent,
            variables: Object.keys(variables).length > 0 ? variables : undefined,
        }));

        dispatch(chatConversationsActions.setCurrentInput({ sessionId, input: '' }));
        dispatch(chatConversationsActions.clearResources(sessionId));
        onSend?.();
    }, [content, isExecuting, agentId, sessionId, variableDefaults, dispatch, onSend]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (submitOnEnter && e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        } else if (!submitOnEnter && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleVoiceMicToggle = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const hasVariables = showVariables && variableDefaults.length > 0;
    const hasContent = content.trim().length > 0;
    const isDisabled = isExecuting || !agentId;

    const containerClass = [
        'flex flex-col gap-1.5 w-full bg-background',
        seamless ? '' : 'border border-border rounded-xl p-2',
    ].filter(Boolean).join(' ');

    const sendBtnClass = [
        'h-8 w-8 flex-shrink-0 rounded-full p-0',
        sendButtonVariant === 'blue'
            ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40'
            : sendButtonVariant === 'gray'
            ? 'bg-muted hover:bg-muted/80 text-foreground disabled:opacity-40'
            : '',
    ].filter(Boolean).join(' ');

    return (
        <div className={containerClass}>
            {/* ── Variable inputs (guided mode — inline above textarea) ─────── */}
            {hasVariables && variableMode === 'guided' && variableDefaults.map((varDef) => {
                const isExpanded = expandedVariable === varDef.name;
                return (
                    <div key={varDef.name} className="flex items-center gap-2 px-1">
                        <button
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => dispatch(chatConversationsActions.setExpandedVariable({
                                sessionId,
                                variableName: isExpanded ? null : varDef.name,
                            }))}
                        >
                            <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            <span>{varDef.name}</span>
                        </button>
                        {isExpanded && (
                            <input
                                className="flex-1 text-xs bg-muted rounded px-2 py-1 text-foreground focus:outline-none"
                                value={varDef.defaultValue ?? ''}
                                placeholder={varDef.helpText ?? `Enter ${varDef.name}...`}
                                style={{ fontSize: '16px' }}
                                onChange={(e) => dispatch(chatConversationsActions.updateVariable({
                                    sessionId,
                                    variableName: varDef.name,
                                    value: e.target.value,
                                }))}
                            />
                        )}
                    </div>
                );
            })}

            {/* ── Resource chips ────────────────────────────────────────────── */}
            {resources.length > 0 && (
                <div className="px-1">
                    <ResourceChips
                        resources={resources}
                        onRemove={(resource) => {
                            const r = resource as unknown as { id: string };
                            dispatch(chatConversationsActions.removeResource({ sessionId, resourceId: r.id ?? '' }));
                        }}
                        onPreview={(resource) => {
                            setPreviewResource(resource);
                            setPreviewSheetOpen(true);
                        }}
                    />
                </div>
            )}

            {/* ── Transcribing loader ───────────────────────────────────────── */}
            {isTranscribing && <TranscriptionLoader />}

            {/* ── Textarea row ──────────────────────────────────────────────── */}
            <div className="flex items-end gap-1.5">
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => dispatch(chatConversationsActions.setCurrentInput({ sessionId, input: e.target.value }))}
                    onKeyDown={handleKeyDown}
                    placeholder={isRecording ? '🎙 Recording...' : placeholder}
                    disabled={isDisabled || isRecording}
                    className={[
                        'flex-1 resize-none bg-transparent text-foreground placeholder:text-muted-foreground',
                        'focus:outline-none py-1 px-1 min-h-[36px] max-h-[200px] overflow-y-auto',
                        compact ? 'text-xs' : 'text-sm',
                    ].join(' ')}
                    style={{ fontSize: '16px' }} // iOS zoom prevention
                    rows={1}
                />

                {/* Voice button */}
                {showVoice && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleVoiceMicToggle}
                        disabled={isTranscribing}
                        className={`h-8 w-8 p-0 flex-shrink-0 ${isRecording ? 'text-red-500' : 'text-muted-foreground'}`}
                        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                    >
                        {isTranscribing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isRecording ? (
                            <MicOff className="w-4 h-4" />
                        ) : (
                            <Mic className="w-4 h-4" />
                        )}
                    </Button>
                )}

                {/* Send button */}
                <Button
                    type="button"
                    className={sendBtnClass}
                    onClick={() => handleSubmit()}
                    disabled={!hasContent || isDisabled || isUploading}
                    aria-label="Send message"
                >
                    {isExecuting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <ArrowUp className="w-4 h-4" />
                    )}
                </Button>
            </div>

            {/* ── Submit hint ───────────────────────────────────────────────── */}
            {showShiftEnterHint && (
                <p className="text-[10px] text-muted-foreground/60 px-1">
                    <kbd className="text-[9px]">⌘+Enter</kbd> to send, <kbd className="text-[9px]">Shift+Enter</kbd> for new line
                </p>
            )}

            {/* ── Submit-on-enter toggle ─────────────────────────────────────── */}
            {showSubmitOnEnterToggle && (
                <div className="flex items-center gap-2 px-1">
                    <button
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setSubmitOnEnter(!submitOnEnter)}
                    >
                        <div className={`w-6 h-3.5 rounded-full transition-colors ${submitOnEnter ? 'bg-blue-500' : 'bg-muted'} relative`}>
                            <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform ${submitOnEnter ? 'translate-x-[13px]' : 'translate-x-0.5'}`} />
                        </div>
                        <CornerDownLeft className="w-3 h-3" />
                        <span>Enter to send</span>
                    </button>
                </div>
            )}
        </div>
    );
}

export default ConversationInput;
