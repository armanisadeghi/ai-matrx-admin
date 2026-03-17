'use client';

import React, { useState, useEffect } from 'react';
import {
    BookText, Briefcase, Copy, FileCode, FileText, Eye, Globe,
    Brain, Save, Volume2, Edit, CheckSquare, Mail, Database,
    Printer, ScanLine,
} from 'lucide-react';
import { copyToClipboard } from '@/components/matrx/buttons/markdown-copy-utils';
import { printMarkdownContent } from '@/features/chat/utils/markdown-print-utils';
import { loadWordPressCSS } from '@/features/html-pages/css/wordpress-styles';
import AdvancedMenu, { MenuItem } from '@/components/official/AdvancedMenu';
import { EmailInputDialog } from '@/components/dialogs/EmailInputDialog';
import { AuthGateDialog } from '@/components/dialogs/AuthGateDialog';
import { QuickSaveModal } from '@/features/notes';
import { NotesAPI } from '@/features/notes';
import { useCartesiaWithPreferences } from '@/hooks/tts/simple/useCartesiaWithPreferences';
import { toast } from 'sonner';
import { useAppSelector } from '@/lib/redux/hooks';
import { selectUser } from '@/lib/redux/slices/userSlice';
import { useQuickActions } from '@/features/quick-actions/hooks/useQuickActions';

// Key for post-auth action resumption
const PENDING_ACTION_KEY = 'matrx_pending_post_auth_action';

// ============================================================================
// PROPS
// ============================================================================

export interface MessageOptionsMenuProps {
    isOpen: boolean;
    content: string;
    messageId?: string;
    sessionId?: string;
    /** DB conversation UUID (for saving / linking to conversation) */
    conversationId?: string;
    /** Legacy taskId support */
    taskId?: string;
    onClose: () => void;
    onShowHtmlPreview?: (html?: string, title?: string) => void;
    onEditContent?: () => void;
    /** Trigger full DOM-capture PDF export */
    onFullPrint?: () => void;
    anchorElement?: HTMLElement | null;
    metadata?: {
        taskId?: string;
        runId?: string;
        messageId?: string;
        [key: string]: unknown;
    };
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Unified message options menu — works in both authenticated and public contexts.
 *
 * Auth-required features (save to notes/scratch, add to tasks) are visible to
 * all users. Unauthenticated users are shown an AuthGateDialog and redirected
 * back to the page after login; the action is stored in sessionStorage and
 * resumed automatically on return.
 */
const MessageOptionsMenu: React.FC<MessageOptionsMenuProps> = ({
    isOpen,
    content,
    messageId,
    sessionId,
    conversationId,
    taskId,
    onClose,
    onShowHtmlPreview,
    onEditContent,
    onFullPrint,
    anchorElement,
    metadata,
}) => {
    const [showEmailDialog, setShowEmailDialog] = useState(false);
    const [showAuthGate, setShowAuthGate] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [authGateFeature, setAuthGateFeature] = useState<{ name: string; description?: string }>({
        name: 'this feature',
    });
    const [isBrowserTtsPlaying, setIsBrowserTtsPlaying] = useState(false);

    const user = useAppSelector(selectUser);
    const isAuthenticated = !!user?.email;

    // Cartesia TTS (authenticated users)
    const voicePreferences = useAppSelector((state) => state.userPreferences?.voice);
    const voiceName = voicePreferences?.voice ? 'Cartesia' : 'Default voice';
    const { speak: cartesiaSpeak, isGenerating: isTtsGenerating, isPlaying: isTtsPlaying } =
        useCartesiaWithPreferences({
            processMarkdown: true,
            onError: (error) => toast.error('Speech playback failed', { description: error }),
            onPlaybackStart: () => toast.success('Playing audio...', { description: `Using ${voiceName}` }),
        });

    const { openQuickTasks } = useQuickActions();

    // ── Resume pending post-auth actions ──────────────────────────────────────
    useEffect(() => {
        if (!isAuthenticated) return;
        try {
            const pending = sessionStorage.getItem(PENDING_ACTION_KEY);
            if (!pending) return;
            sessionStorage.removeItem(PENDING_ACTION_KEY);
            const { action, savedContent } = JSON.parse(pending) as { action: string; savedContent: string };
            if (savedContent !== content) return;
            if (action === 'save-scratch') {
                NotesAPI.create({ label: 'New Note', content: savedContent, folder_name: 'Scratch', tags: [] })
                    .then(() => toast.success('Saved to Scratch!'))
                    .catch(() => toast.error('Failed to save to Scratch'));
            } else if (action === 'save-notes') {
                setIsSaveModalOpen(true);
            } else if (action === 'add-to-tasks') {
                openQuickTasks({ content: savedContent, prePopulate: { title: 'New Task from AI Response', description: savedContent, metadataInfo: '' } });
            }
        } catch { /* ignore parse errors */ }
    }, [isAuthenticated, content, openQuickTasks]);

    // ── Auth gate helper ───────────────────────────────────────────────────────
    const requireAuth = (actionKey: string, featureName: string, description: string): boolean => {
        if (!isAuthenticated) {
            try {
                sessionStorage.setItem(PENDING_ACTION_KEY, JSON.stringify({ action: actionKey, savedContent: content }));
            } catch { /* ignore */ }
            setAuthGateFeature({ name: featureName, description });
            setShowAuthGate(true);
            return false;
        }
        return true;
    };

    const getErrorMessage = (error: unknown, fallback: string): string => {
        if (error instanceof Error) return error.message || fallback;
        if (typeof error === 'string') return error || fallback;
        return fallback;
    };

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleEditContent = () => { onEditContent?.(); onClose(); };

    const handleAddToTasks = () => {
        if (!requireAuth('add-to-tasks', 'Add to Tasks', 'Sign in to create and track tasks from your AI responses.')) return;
        openQuickTasks({
            content,
            metadata,
            prePopulate: {
                title: 'New Task from AI Response',
                description: content,
                metadataInfo: metadata ? `\n\n---\n**Origin:**\n${JSON.stringify(metadata, null, 2)}` : '',
            },
        });
        onClose();
    };

    const handlePlayAudio = async () => {
        if (isAuthenticated) {
            await cartesiaSpeak(content);
        } else {
            // Public: browser speechSynthesis
            if (typeof window === 'undefined' || !window.speechSynthesis) {
                toast.error('Audio not supported in this browser');
                return;
            }
            if (isBrowserTtsPlaying) {
                window.speechSynthesis.cancel();
                setIsBrowserTtsPlaying(false);
                return;
            }
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(content.replace(/[#*_`[\]()|]/g, ' ').trim());
            utterance.rate = 1.0;
            utterance.onend = () => setIsBrowserTtsPlaying(false);
            utterance.onerror = () => setIsBrowserTtsPlaying(false);
            window.speechSynthesis.speak(utterance);
            setIsBrowserTtsPlaying(true);
        }
    };

    const handleCopyPlain = async () => {
        await copyToClipboard(content, {
            onSuccess: () => {},
            onError: (error) => { throw new Error(getErrorMessage(error, 'Failed to copy text')); },
        });
    };

    const handleCopyGoogleDocs = async () => {
        await copyToClipboard(content, {
            isMarkdown: true, formatForGoogleDocs: true,
            onSuccess: () => {},
            onError: (error) => { throw new Error(getErrorMessage(error, 'Failed to copy for Docs')); },
        });
    };

    const handleCopyWithThinking = async () => {
        await copyToClipboard(content, {
            isMarkdown: true, includeThinking: true,
            onSuccess: () => {},
            onError: (error) => { throw new Error(getErrorMessage(error, 'Failed to copy with thinking')); },
        });
    };

    const handleHtmlPreview = async () => {
        if (!onShowHtmlPreview) {
            setShowAuthGate(false);
            onShowHtmlPreview?.();
            onClose();
            return;
        }
        await copyToClipboard(content, {
            isMarkdown: true, formatForWordPress: true, showHtmlPreview: true,
            onShowHtmlPreview: (html) => { onShowHtmlPreview(html, 'HTML Preview'); onClose(); },
            onSuccess: () => {},
            onError: (error) => { throw new Error(getErrorMessage(error, 'Failed to generate HTML')); },
        });
    };

    const handleCopyCompleteHTML = async () => {
        await copyToClipboard(content, {
            isMarkdown: true, formatForWordPress: true, showHtmlPreview: true,
            onShowHtmlPreview: async (filteredHtml) => {
                const cssContent = await loadWordPressCSS();
                const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Content</title><style>${cssContent}</style></head><body>${filteredHtml}</body></html>`;
                await copyToClipboard(html, { onSuccess: () => {}, onError: () => {} });
            },
            onSuccess: () => {},
            onError: (error) => { throw new Error(getErrorMessage(error, 'Failed to copy HTML')); },
        });
    };

    const handleSaveAsFile = () => {
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `ai-response-${ts}.md`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
        onClose();
    };

    const handlePrint = () => { printMarkdownContent(content, 'AI Response'); onClose(); };

    const handleFullPrintClick = () => { onFullPrint?.(); onClose(); };

    const handleEmailToMe = async () => {
        if (!isAuthenticated) {
            setShowEmailDialog(true);
            return;
        }
        const response = await fetch('/api/chat/email-response', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, metadata: { ...metadata, timestamp: new Date().toLocaleString() } }),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.msg || 'Failed to send email');
        onClose();
    };

    const handleSaveToScratch = async () => {
        if (!requireAuth('save-scratch', 'Save to Scratch', 'Sign in to save notes to your Scratch folder.')) return;
        await NotesAPI.create({ label: 'New Note', content, folder_name: 'Scratch', tags: [] });
    };

    const handleSaveToNotes = () => {
        if (!requireAuth('save-notes', 'Save to Notes', 'Sign in to save notes and organize your AI responses.')) return;
        setIsSaveModalOpen(true);
    };

    // ── Build menu items (filtering hidden ones before passing to AdvancedMenu) ──
    const allItems: MenuItem[] = [
        {
            key: 'edit-content', icon: Edit, iconColor: 'text-emerald-500 dark:text-emerald-400',
            label: 'Edit content', action: handleEditContent,
            category: 'Edit', successMessage: 'Opening editor...', showToast: false,
        },
        {
            key: 'add-to-tasks', icon: CheckSquare, iconColor: 'text-blue-500 dark:text-blue-400',
            label: 'Add to Tasks', action: handleAddToTasks,
            category: 'Actions', successMessage: 'Opening Tasks...', showToast: false,
        },
        {
            key: 'play-audio', icon: Volume2, iconColor: 'text-indigo-500 dark:text-indigo-400',
            label: 'Play audio', action: handlePlayAudio,
            category: 'Audio', successMessage: 'Playing audio...', errorMessage: 'Failed to play audio',
            disabled: isTtsGenerating || isTtsPlaying || isBrowserTtsPlaying,
        },
        {
            key: 'copy-plain', icon: Copy, iconColor: 'text-blue-500 dark:text-blue-400',
            label: 'Copy text', action: handleCopyPlain,
            category: 'Copy', successMessage: 'Copied', errorMessage: 'Failed to copy',
        },
        {
            key: 'copy-docs', icon: FileText, iconColor: 'text-green-500 dark:text-green-400',
            label: 'Copy for Docs', action: handleCopyGoogleDocs,
            category: 'Copy', successMessage: 'Formatted for Google Docs', errorMessage: 'Failed to copy',
        },
        {
            key: 'copy-thinking', icon: Brain, iconColor: 'text-purple-500 dark:text-purple-400',
            label: 'With thinking', action: handleCopyWithThinking,
            category: 'Copy', successMessage: 'Copied with thinking', errorMessage: 'Failed to copy',
        },
        {
            key: 'html-preview', icon: Eye, iconColor: 'text-indigo-500 dark:text-indigo-400',
            label: 'HTML preview', action: handleHtmlPreview,
            category: 'Export', successMessage: 'Preview opened', errorMessage: 'Failed to open preview',
        },
        {
            key: 'copy-html', icon: Globe, iconColor: 'text-orange-500 dark:text-orange-400',
            label: 'Copy HTML page', action: handleCopyCompleteHTML,
            category: 'Export', successMessage: 'HTML page copied', errorMessage: 'Failed to copy HTML',
        },
        {
            key: 'email-to-me', icon: Mail, iconColor: 'text-sky-500 dark:text-sky-400',
            label: 'Email to me', action: handleEmailToMe,
            category: 'Export', successMessage: 'Email sent!', errorMessage: 'Failed to send email',
        },
        {
            key: 'print', icon: Printer, iconColor: 'text-slate-500 dark:text-slate-400',
            label: 'Print / Save PDF', action: handlePrint,
            category: 'Export', successMessage: 'Opening print view...', showToast: false,
        },
        // Full DOM-capture PDF — only shown when handler is provided
        ...(onFullPrint ? [{
            key: 'full-print', icon: ScanLine, iconColor: 'text-slate-600 dark:text-slate-300',
            label: 'Full Print (all blocks)', action: handleFullPrintClick,
            category: 'Export', successMessage: 'Generating PDF...', showToast: false,
        } as MenuItem] : []),
        {
            key: 'save-scratch', icon: FileText, iconColor: 'text-cyan-500 dark:text-cyan-400',
            label: 'Save to Scratch', action: handleSaveToScratch,
            category: 'Actions', successMessage: 'Saved to Scratch!', errorMessage: 'Failed to save',
        },
        {
            key: 'save-notes', icon: Save, iconColor: 'text-violet-500 dark:text-violet-400',
            label: 'Save to Notes', action: handleSaveToNotes,
            category: 'Actions', successMessage: 'Opening save dialog...', showToast: false,
        },
        {
            key: 'save-file', icon: FileCode, iconColor: 'text-rose-500 dark:text-rose-400',
            label: 'Save as file', action: handleSaveAsFile,
            category: 'Actions', successMessage: 'File saved!', errorMessage: 'Failed to save file',
        },
        {
            key: 'convert-broker', icon: Briefcase, iconColor: 'text-amber-500 dark:text-amber-400',
            label: 'Convert to broker',
            action: () => { toast.info('Coming soon', { description: 'Convert to broker will be available shortly.' }); onClose(); },
            category: 'Actions', showToast: false,
        },
        {
            key: 'add-docs', icon: BookText, iconColor: 'text-emerald-500 dark:text-emerald-400',
            label: 'Add to docs',
            action: () => { toast.info('Coming soon', { description: 'Add to docs will be available shortly.' }); onClose(); },
            category: 'Actions', showToast: false,
        },
    ];

    const menuItems = allItems;

    return (
        <>
            <AdvancedMenu
                isOpen={isOpen}
                onClose={onClose}
                items={menuItems}
                title="Message Options"
                position="bottom-left"
                anchorElement={anchorElement}
            />

            <QuickSaveModal
                open={isSaveModalOpen}
                onOpenChange={setIsSaveModalOpen}
                initialContent={content}
                defaultFolder="Scratch"
                onSaved={() => { setIsSaveModalOpen(false); onClose(); }}
            />

            {showEmailDialog && (
                <EmailInputDialog
                    isOpen={showEmailDialog}
                    onClose={() => setShowEmailDialog(false)}
                    onSubmit={async (email) => {
                        const response = await fetch('/api/chat/email-response', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                email,
                                content,
                                metadata: { ...metadata, timestamp: new Date().toLocaleString() },
                            }),
                        });
                        const data = await response.json() as { success?: boolean; msg?: string };
                        if (!data.success) throw new Error(data.msg || 'Failed to send email');
                        setShowEmailDialog(false);
                        onClose();
                    }}
                />
            )}

            {showAuthGate && (
                <AuthGateDialog
                    isOpen={showAuthGate}
                    onClose={() => setShowAuthGate(false)}
                    featureName={authGateFeature.name}
                    featureDescription={authGateFeature.description}
                />
            )}
        </>
    );
};

export default MessageOptionsMenu;
