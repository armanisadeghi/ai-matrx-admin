jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid'),
}));
jest.mock('@/utils/supabase/client', () => ({
    supabase: { from: jest.fn() },
    createClient: jest.fn(),
}));
jest.mock('@/features/notes', () => ({
    NotesAPI: { create: jest.fn().mockResolvedValue({}) },
    QuickSaveModal: jest.fn(),
}));
jest.mock('@/components/matrx/buttons/markdown-copy-utils', () => ({
    copyToClipboard: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/features/conversation/utils/markdown-print', () => ({
    printMarkdownContent: jest.fn(),
}));
jest.mock('@/features/html-pages/css/wordpress-styles', () => ({
    loadWordPressCSS: jest.fn().mockResolvedValue(''),
}));
jest.mock('sonner', () => ({
    toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));
jest.mock('@/features/cx-conversation/redux/thunks/editMessage', () => ({
    editMessage: jest.fn(),
}));
jest.mock('@/features/cx-conversation/utils/buildContentBlocksForSave', () => ({
    buildContentBlocksForSave: jest.fn().mockReturnValue([]),
}));

import { getMessageActions } from '../../actions/messageActionRegistry';

const noop = () => {};
const noopAsync = async () => {};

function makeContext(overrides = {}) {
    return {
        instanceId: 'test-instance',
        content: 'Test content',
        isAuthenticated: true,
        sessionId: 'sess-1',
        messageId: 'msg-1',
        conversationId: 'conv-1',
        rawContent: null,
        metadata: null,
        hasUnsavedChanges: false,
        hasHistory: false,
        dispatch: jest.fn() as any,
        onClose: jest.fn(),
        showFullPrint: false,
        ttsState: {
            isTtsGenerating: false,
            isTtsPlaying: false,
            isBrowserTtsPlaying: false,
            cartesiaSpeak: noopAsync,
            setBrowserTtsPlaying: noop,
        },
        ...overrides,
    };
}

describe('getMessageActions', () => {
    it('returns items for a standard authenticated context', () => {
        const items = getMessageActions(makeContext());
        expect(items.length).toBeGreaterThan(0);
        const keys = items.map((i) => i.key);
        expect(keys).toContain('copy-plain');
        expect(keys).toContain('save-notes');
        expect(keys).toContain('edit-content');
        expect(keys).toContain('email-to-me');
        expect(keys).toContain('play-audio');
    });

    it('hides reset-original when hasUnsavedChanges is false', () => {
        const items = getMessageActions(makeContext({ hasUnsavedChanges: false }));
        const resetItem = items.find((i) => i.key === 'reset-original');
        expect(resetItem?.disabled).toBe(true);
    });

    it('enables reset-original when hasUnsavedChanges is true', () => {
        const items = getMessageActions(makeContext({ hasUnsavedChanges: true }));
        const resetItem = items.find((i) => i.key === 'reset-original');
        expect(resetItem?.disabled).toBe(false);
    });

    it('hides save-edits when no unsaved changes', () => {
        const items = getMessageActions(makeContext({ hasUnsavedChanges: false }));
        const saveItem = items.find((i) => i.key === 'save-edits');
        expect(saveItem?.disabled).toBe(true);
    });

    it('hides session-dependent items when sessionId is null', () => {
        const items = getMessageActions(makeContext({ sessionId: null, messageId: null }));
        const resetItem = items.find((i) => i.key === 'reset-original');
        const saveEdits = items.find((i) => i.key === 'save-edits');
        expect(resetItem?.hidden).toBe(true);
        expect(saveEdits?.hidden).toBe(true);
    });

    it('hides view-history when hasHistory is false', () => {
        const items = getMessageActions(makeContext({ hasHistory: false }));
        const historyItem = items.find((i) => i.key === 'view-history');
        expect(historyItem?.hidden).toBe(true);
    });

    it('shows view-history when hasHistory is true', () => {
        const items = getMessageActions(makeContext({ hasHistory: true }));
        const historyItem = items.find((i) => i.key === 'view-history');
        expect(historyItem?.hidden).toBeFalsy();
    });

    it('excludes full-print when showFullPrint is false', () => {
        const items = getMessageActions(makeContext({ showFullPrint: false }));
        const fullPrint = items.find((i) => i.key === 'full-print');
        expect(fullPrint).toBeUndefined();
    });

    it('includes full-print when showFullPrint is true and handler provided', () => {
        const items = getMessageActions(
            makeContext({ showFullPrint: true, onFullPrint: noop }),
        );
        const fullPrint = items.find((i) => i.key === 'full-print');
        expect(fullPrint).toBeDefined();
    });

    it('disables play-audio when TTS is generating', () => {
        const items = getMessageActions(
            makeContext({
                ttsState: {
                    isTtsGenerating: true,
                    isTtsPlaying: false,
                    isBrowserTtsPlaying: false,
                    cartesiaSpeak: noopAsync,
                    setBrowserTtsPlaying: noop,
                },
            }),
        );
        const audioItem = items.find((i) => i.key === 'play-audio');
        expect(audioItem?.disabled).toBe(true);
    });

    it('save-notes action dispatches openOverlay for authenticated user', () => {
        const dispatch = jest.fn();
        const items = getMessageActions(makeContext({ dispatch: dispatch as any }));
        const saveNotes = items.find((i) => i.key === 'save-notes');
        expect(saveNotes).toBeDefined();

        saveNotes!.action();

        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'messageActions/openOverlay',
                payload: expect.objectContaining({
                    instanceId: 'test-instance',
                    overlay: 'saveToNotes',
                }),
            }),
        );
    });

    it('edit-content action dispatches openOverlay for fullScreenEditor', () => {
        const dispatch = jest.fn();
        const onClose = jest.fn();
        const items = getMessageActions(makeContext({ dispatch: dispatch as any, onClose }));
        const editItem = items.find((i) => i.key === 'edit-content');

        editItem!.action();

        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'messageActions/openOverlay',
                payload: expect.objectContaining({
                    overlay: 'fullScreenEditor',
                }),
            }),
        );
        expect(onClose).toHaveBeenCalled();
    });

    it('html-preview action dispatches openOverlay for htmlPreview', () => {
        const dispatch = jest.fn();
        const onClose = jest.fn();
        const items = getMessageActions(makeContext({ dispatch: dispatch as any, onClose }));
        const htmlItem = items.find((i) => i.key === 'html-preview');

        htmlItem!.action();

        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'messageActions/openOverlay',
                payload: expect.objectContaining({
                    overlay: 'htmlPreview',
                }),
            }),
        );
        expect(onClose).toHaveBeenCalled();
    });

    it('view-history dispatches openOverlay for contentHistory', () => {
        const dispatch = jest.fn();
        const onClose = jest.fn();
        const items = getMessageActions(
            makeContext({ hasHistory: true, dispatch: dispatch as any, onClose }),
        );
        const historyItem = items.find((i) => i.key === 'view-history');

        historyItem!.action();

        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'messageActions/openOverlay',
                payload: expect.objectContaining({
                    overlay: 'contentHistory',
                }),
            }),
        );
        expect(onClose).toHaveBeenCalled();
    });

    it('unauthenticated user triggers authGate for save-notes', () => {
        const dispatch = jest.fn();
        const items = getMessageActions(
            makeContext({ isAuthenticated: false, dispatch: dispatch as any }),
        );
        const saveNotes = items.find((i) => i.key === 'save-notes');

        saveNotes!.action();

        expect(dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'messageActions/openOverlay',
                payload: expect.objectContaining({
                    overlay: 'authGate',
                }),
            }),
        );
    });

    it('all items have unique keys', () => {
        const items = getMessageActions(
            makeContext({ showFullPrint: true, onFullPrint: noop, hasHistory: true }),
        );
        const keys = items.map((i) => i.key);
        expect(new Set(keys).size).toBe(keys.length);
    });

    it('all items have a category', () => {
        const items = getMessageActions(makeContext());
        for (const item of items) {
            expect(item.category).toBeTruthy();
        }
    });
});
