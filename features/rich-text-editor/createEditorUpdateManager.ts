import { debounce } from 'lodash';
import { extractEncodedTextFromDom } from './utils/editorUtils';
import { EditorContextValue, useEditorContext } from './provider/provider';

interface UpdateOptions {
    immediate?: boolean;
    force?: boolean;
    source?: 'input' | 'paste' | 'delete' | 'cut' | 'programmatic';
}

interface ContentState {
    content: string;
    timestamp: number;
    dirty: boolean;
    pending: boolean;
    initialized: boolean;
}

interface ManagerOptions {
    debounceDelay?: number;
    maxWait?: number;
    minUpdateInterval?: number;
}

const DEFAULT_OPTIONS = {
    debounceDelay: 1000,
    maxWait: 2000,
    minUpdateInterval: 250
} as const;

export const createEditorUpdateManager = (
    componentId: string, 
    onChange?: (text: string) => void,
    userOptions?: ManagerOptions
) => {

    const context = useEditorContext();

    const options = {
        ...DEFAULT_OPTIONS,
        ...userOptions
    };

    let state: ContentState = {
        content: '',
        timestamp: Date.now(),
        dirty: false,
        pending: false,
        initialized: false
    };

    let processingOperationCount = 0;

    const shouldSkipUpdate = (newContent: string, opts: UpdateOptions): boolean => {
        if (!state.initialized) {
            console.debug(`[Editor:${componentId}] Skipping update - not initialized`);
            return true;
        }
        
        if (processingOperationCount > 0) {
            console.debug(`[Editor:${componentId}] Skipping update - processing operation in progress`);
            return true;
        }

        if (opts.force) return false;
        if (newContent === state.content) return true;
        
        const timeSinceLastUpdate = Date.now() - state.timestamp;
        return !opts.immediate && timeSinceLastUpdate < options.minUpdateInterval;
    };

    const handleContentUpdate = (
        element: HTMLDivElement,
        opts: UpdateOptions = {}
    ): void => {
        if (!element) return;
        if (!state.initialized) return;

        const startTime = performance.now();
        const newContent = extractEncodedTextFromDom(element);
        
        if (shouldSkipUpdate(newContent, opts)) {
            if (!state.pending) {
                state.dirty = true;
            }
            return;
        }

        processingOperationCount++;
        
        try {
            state = {
                content: newContent,
                timestamp: Date.now(),
                dirty: false,
                pending: false,
                initialized: true
            };

            context.setContent(componentId, newContent);
            onChange?.(newContent);

            const duration = performance.now() - startTime;
            if (duration > 100) {
                console.warn(`[Editor:${componentId}] Slow update detected: ${duration.toFixed(2)}ms`);
            }
        } finally {
            processingOperationCount--;
        }
    };

    const debouncedUpdate = debounce(
        (element: HTMLDivElement, opts: UpdateOptions) => {
            if (!state.initialized) return;
            
            state.pending = true;
            handleContentUpdate(element, opts);
        },
        options.debounceDelay,
        {
            leading: false,
            trailing: true,
            maxWait: options.maxWait
        }
    );

    const getInputType = (e: React.FormEvent<HTMLDivElement>): string => {
        return (e as unknown as InputEvent).inputType || '';
    };

    const needsImmediateUpdate = (inputType: string): boolean => {
        const immediateTypes = new Set([
            'deleteByCut',
            'insertFromPaste',
            'deleteContentBackward',
            'deleteContentForward',
            'insertFromDrop',
            'insertFromYank',
            'insertReplacementText'
        ]);
        return immediateTypes.has(inputType);
    };

    return {
        initialize: () => {
            if (!state.initialized) {
                console.debug(`[Editor:${componentId}] Initializing editor manager`);
                state.initialized = true;
            }
        },

        handleInput: (e: React.FormEvent<HTMLDivElement>) => {
            if (!state.initialized || processingOperationCount > 0) return;

            const element = e.currentTarget;
            const inputType = getInputType(e);

            if (needsImmediateUpdate(inputType)) {
                debouncedUpdate.cancel();
                console.debug(`[Editor:${componentId}] Handling immediate update`);
                handleContentUpdate(element, { 
                    immediate: true,
                    source: inputType.includes('paste') ? 'paste' : 
                            inputType.includes('delete') ? 'delete' :
                            inputType.includes('cut') ? 'cut' : 'input'
                });
                return;
            }

            debouncedUpdate(element, { source: 'input' });
        },

        forceUpdate: (element: HTMLDivElement) => {
            if (!state.initialized) return;
            
            debouncedUpdate.cancel();
            console.log(`[Editor:${componentId}] Forcing update`);
            handleContentUpdate(element, { 
                immediate: true, 
                force: true,
                source: 'programmatic' 
            });
        },

        cancelPendingUpdates: () => {
            debouncedUpdate.cancel();
            console.debug(`[Editor:${componentId}] Cancelling pending updates`);
            state.pending = false;
        },

        flushPendingUpdates: (element: HTMLDivElement) => {
            if (!state.initialized) return;
            
            if (state.dirty || state.pending) {
                debouncedUpdate.cancel();
                console.debug(`[Editor:${componentId}] Flushing pending updates`);
                handleContentUpdate(element, { 
                    immediate: true,
                    source: 'programmatic'
                });
            }
        },

        getState: () => ({ ...state }),

        cleanup: () => {
            console.debug(`[Editor:${componentId}] Cleaning up editor manager`);
            debouncedUpdate.cancel();
            state = {
                content: '',
                timestamp: 0,
                dirty: false,
                pending: false,
                initialized: false
            };
            processingOperationCount = 0;
        }
    };
};