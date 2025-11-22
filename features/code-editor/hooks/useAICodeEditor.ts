import { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { shallowEqual } from 'react-redux';
import {
    startPromptInstance,
    executeMessage,
    updateVariable,
    setCurrentInput,
    removeInstance,
    selectInstance,
    selectStreamingTextForInstance,
    selectIsResponseEndedForInstance,
    selectMergedVariables,
} from '@/lib/redux/prompt-execution';
import { completeExecutionThunk } from '@/lib/redux/prompt-execution/thunks/completeExecutionThunk';
import { selectPromptsPreferences } from '@/lib/redux/selectors/userPreferenceSelectors';
import { selectCachedPrompt } from '@/lib/redux/slices/promptCacheSlice';
import { parseCodeEdits, validateEdits } from '@/features/code-editor/utils/parseCodeEdits';
import { applyCodeEdits } from '@/features/code-editor/utils/applyCodeEdits';
import { getDiffStats } from '@/features/code-editor/utils/generateDiff';
import { getCodeEditorBuiltinId } from '@/features/code-editor/utils/codeEditorPrompts';
import {
    buildSpecialVariables,
    filterOutSpecialVariables,
    getRequiredSpecialVariables,
    logSpecialVariablesUsage,
    type CodeEditorContext
} from '@/features/code-editor/utils/specialVariables';
import type { Resource } from '@/features/prompts/components/resource-display';
import { normalizeLanguage } from '@/features/code-editor/utils/languages';

export type EditorState = 'input' | 'processing' | 'review' | 'applying' | 'complete' | 'error';

export interface UseAICodeEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentCode: string;
    language: string;
    builtinId?: string;
    promptContext?: 'prompt-app-ui' | 'generic';
    onCodeChange: (newCode: string) => void;
    selection?: string;
    context?: string;
}

export function useAICodeEditor({
    open,
    onOpenChange,
    currentCode,
    language: rawLanguage,
    builtinId,
    promptContext = 'generic',
    onCodeChange,
    selection,
    context,
}: UseAICodeEditorProps) {
    const dispatch = useAppDispatch();

    // Get user preferences
    const promptsPreferences = useAppSelector(selectPromptsPreferences);
    const submitOnEnterPreference = promptsPreferences.submitOnEnter;

    // Normalize the language for consistent syntax highlighting
    const language = normalizeLanguage(rawLanguage);

    // Use explicit builtinId if provided, otherwise use context
    const defaultBuiltinId = builtinId || getCodeEditorBuiltinId(promptContext);

    // State for prompt selection
    const [selectedBuiltinId, setSelectedBuiltinId] = useState(defaultBuiltinId);

    // State for submit on enter (defaults to user preference)
    const [submitOnEnter, setSubmitOnEnter] = useState(promptsPreferences.submitOnEnter);

    // Redux instance management
    const [instanceId, setInstanceId] = useState<string | null>(null);
    const instance = useAppSelector(state =>
        instanceId ? selectInstance(state, instanceId) : null
    );
    const streamingText = useAppSelector(state =>
        instanceId ? selectStreamingTextForInstance(state, instanceId) : ''
    );
    const isResponseEnded = useAppSelector(state =>
        instanceId ? selectIsResponseEndedForInstance(state, instanceId) : false
    );
    // Use shallowEqual to prevent unnecessary re-renders from object reference changes
    const variables = useAppSelector(
        state => instanceId ? selectMergedVariables(state, instanceId) : {},
        shallowEqual
    );
    const cachedPrompt = useAppSelector(state =>
        selectedBuiltinId ? selectCachedPrompt(state, selectedBuiltinId) : null
    );

    // Resources
    const [resources, setResources] = useState<Resource[]>([]);
    const [expandedVariable, setExpandedVariable] = useState<string | null>(null);

    const [state, setState] = useState<EditorState>('input');
    const [parsedEdits, setParsedEdits] = useState<ReturnType<typeof parseCodeEdits> | null>(null);
    const [modifiedCode, setModifiedCode] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [rawAIResponse, setRawAIResponse] = useState('');
    const [isCopied, setIsCopied] = useState(false);

    const isExecuting = instance?.status === 'executing' || instance?.status === 'streaming';
    const isLoadingPrompt = instance?.status === 'initializing';

    // Initialize prompt instance when modal opens or builtin changes
    useEffect(() => {
        if (open && selectedBuiltinId) {
            const initInstance = async () => {
                try {
                    // First, we need to fetch the prompt to see what variables it needs
                    // We'll let startPromptInstance handle the fetch, then update special vars after
                    const id = await dispatch(startPromptInstance({
                        promptId: selectedBuiltinId,
                        promptSource: 'prompt_builtins',
                        variables: {}, // Empty for now, we'll populate after
                        executionConfig: {
                            auto_run: false,
                            allow_chat: false,
                            show_variables: true,
                            apply_variables: true,
                            track_in_runs: false, // Don't track code edits in runs
                        },
                    })).unwrap();

                    setInstanceId(id);

                    // Now populate special variables based on what the prompt needs
                    // This will happen in the next effect when cachedPrompt is loaded
                } catch (err) {
                    console.error('Error initializing prompt instance:', err);
                    setState('error');
                    setErrorMessage(err instanceof Error ? err.message : 'Failed to initialize');
                }
            };

            initInstance();
        }
    }, [open, selectedBuiltinId, dispatch]);

    // Populate special variables when prompt is loaded
    useEffect(() => {
        if (instanceId && cachedPrompt) {
            const promptVariables = cachedPrompt.variableDefaults || [];
            const requiredSpecialVars = getRequiredSpecialVariables(promptVariables);

            if (requiredSpecialVars.length > 0) {
                // Build code context
                const codeContext: CodeEditorContext = {
                    currentCode,
                    selection,
                    context,
                };

                // Build special variables
                const specialVars = buildSpecialVariables(codeContext, requiredSpecialVars);

                // Log what we're doing (helpful for debugging)
                logSpecialVariablesUsage(cachedPrompt.name, specialVars);

                // Update Redux with special variables
                Object.entries(specialVars).forEach(([name, value]) => {
                    dispatch(updateVariable({
                        instanceId,
                        variableName: name,
                        value,
                    }));
                });
            }
        }
    }, [instanceId, cachedPrompt, currentCode, selection, context, dispatch]);

    // Reset state and cleanup when modal closes
    useEffect(() => {
        if (!open) {
            // Cleanup instance
            if (instanceId) {
                dispatch(removeInstance({ instanceId }));
            }

            // Reset all state
            setInstanceId(null);
            setResources([]);
            setExpandedVariable(null);
            setState('input');
            setParsedEdits(null);
            setModifiedCode('');
            setErrorMessage('');
            setRawAIResponse('');
            setIsCopied(false);
            setSelectedBuiltinId(defaultBuiltinId);
            setSubmitOnEnter(submitOnEnterPreference);
        }
    }, [open, defaultBuiltinId, submitOnEnterPreference, instanceId, dispatch]);

    // Update selected builtin when default changes (e.g., when modal reopens with different context)
    useEffect(() => {
        if (open) {
            setSelectedBuiltinId(defaultBuiltinId);
        }
    }, [open, defaultBuiltinId]);

    // Complete execution when streaming ends
    useEffect(() => {
        if (
            instanceId &&
            instance &&
            isResponseEnded &&
            streamingText &&
            (instance.status === 'streaming' || instance.status === 'executing') &&
            instance.execution.messageStartTime
        ) {
            // CRITICAL: Save the streaming text BEFORE calling completeExecutionThunk
            // The thunk sets currentTaskId to null, which makes the selector return ''
            // So we must preserve the text in component state first
            setRawAIResponse(streamingText);

            const totalTime = Date.now() - instance.execution.messageStartTime;
            const timeToFirstToken = instance.execution.timeToFirstToken;

            dispatch(completeExecutionThunk({
                instanceId,
                responseText: streamingText,
                timeToFirstToken,
                totalTime,
            }));
        }
    }, [instanceId, instance, isResponseEnded, streamingText, dispatch]);

    // Parse response when streaming completes
    useEffect(() => {
        // Use rawAIResponse instead of streamingText because streamingText
        // becomes empty after completeExecution sets currentTaskId to null
        if (rawAIResponse && !isExecuting && state === 'processing') {
            // Response complete, try to parse for edits
            const parsed = parseCodeEdits(rawAIResponse);
            setParsedEdits(parsed);

            // CRITICAL: No edits found = normal conversation, NOT an error
            // The AI can chat, ask questions, provide explanations without edits
            if (!parsed.success || parsed.edits.length === 0) {
                console.log('📝 No code edits found in response - continuing conversation');
                // Reset to input state to continue the conversation
                setState('input');
                return;
            }


            // Validate edits against current code
            const validation = validateEdits(currentCode, parsed.edits);

            // Show warnings if using fuzzy matching
            if (validation.warnings.length > 0) {
                console.log('⚠️ Fuzzy Matching Applied:');
                validation.warnings.forEach(w => console.log(`  - ${w}`));
            }

            if (!validation.valid) {
                console.error('❌ Edit validation failed');
                setState('error');
                let errorMsg = `⚠️ INVALID CODE EDITS\n\n`;
                errorMsg += `The AI provided ${parsed.edits.length} edit${parsed.edits.length !== 1 ? 's' : ''}, but some SEARCH patterns don't match the current code.\n\n`;
                errorMsg += `This usually means the AI is trying to edit code that doesn't exist or has changed.\n`;
                errorMsg += `You can continue the conversation to clarify or try again.\n\n`;

                if (validation.warnings.length > 0) {
                    errorMsg += `✓ ${validation.warnings.length} edit${validation.warnings.length !== 1 ? 's' : ''} will use fuzzy matching (whitespace-tolerant)\n`;
                }

                errorMsg += `✗ ${validation.errors.length} edit${validation.errors.length !== 1 ? 's' : ''} failed validation\n\n`;
                errorMsg += `${'═'.repeat(70)}\n`;
                validation.errors.forEach((err) => {
                    errorMsg += err;
                    errorMsg += `\n`;
                });
                setErrorMessage(errorMsg);
                return;
            }

            // Apply edits to generate preview
            const result = applyCodeEdits(currentCode, parsed.edits);

            // Log warnings
            if (result.warnings.length > 0) {
                console.log('✓ Applied with fuzzy matching:');
                result.warnings.forEach(w => console.log(`  - ${w}`));
            }

            if (!result.success) {
                setState('error');
                let errorMsg = `Error Applying Edits:\n\n`;
                result.errors.forEach((err, i) => {
                    errorMsg += `${i + 1}. ${err}\n`;
                });
                setErrorMessage(errorMsg);
                return;
            }

            setModifiedCode(result.code || '');
            setState('review');
        }
    }, [rawAIResponse, isExecuting, state, currentCode]);

    const handleSubmit = async () => {
        if (!instanceId || !cachedPrompt) {
            setErrorMessage('Instance not initialized');
            setState('error');
            return;
        }

        setState('processing');

        try {
            // Update ALL special variables with latest values before execution
            const promptVariables = cachedPrompt.variableDefaults || [];
            const requiredSpecialVars = getRequiredSpecialVariables(promptVariables);

            if (requiredSpecialVars.length > 0) {
                const codeContext: CodeEditorContext = {
                    currentCode,
                    selection,
                    context,
                };

                const specialVars = buildSpecialVariables(codeContext, requiredSpecialVars);

                // Update each special variable
                Object.entries(specialVars).forEach(([name, value]) => {
                    dispatch(updateVariable({
                        instanceId,
                        variableName: name,
                        value,
                    }));
                });
            }

            // Prepare user input with resources if any
            // CRITICAL: NEVER modify the user's message - instructions are in the prompt itself
            let finalUserInput = instance?.conversation.currentInput.trim() || '';

            if (resources.length > 0) {
                // Add resources as context in the user message
                const resourceContext = resources.map((resource, index) => {
                    if (resource.type === 'file') {
                        const filename = resource.data.filename || resource.data.details?.filename || 'file';
                        return `[Attachment ${index + 1}: ${filename}]`;
                    } else if (resource.type === 'image_url') {
                        return `[Image ${index + 1}: ${resource.data.url}]`;
                    } else if (resource.type === 'file_url') {
                        const filename = resource.data.filename || 'file';
                        return `[File URL ${index + 1}: ${filename}]`;
                    } else if (resource.type === 'webpage') {
                        return `[Webpage ${index + 1}: ${resource.data.title || resource.data.url}]`;
                    } else if (resource.type === 'youtube') {
                        return `[YouTube ${index + 1}: ${resource.data.title || resource.data.videoId}]`;
                    }
                    return `[Resource ${index + 1}]`;
                }).filter(Boolean).join('\n');

                if (resourceContext) {
                    finalUserInput = resourceContext + (finalUserInput ? '\n\n' + finalUserInput : '');
                }
            }

            await dispatch(executeMessage({
                instanceId,
                userInput: finalUserInput || undefined,
            })).unwrap();
        } catch (err) {
            setState('error');
            setErrorMessage(err instanceof Error ? err.message : 'Unknown error');
        }
    };

    // Handlers for PromptInput
    const handleVariableValueChange = useCallback((variableName: string, value: string) => {
        if (!instanceId) return;
        dispatch(updateVariable({
            instanceId,
            variableName,
            value,
        }));
    }, [instanceId, dispatch]);

    const handleChatInputChange = useCallback((value: string) => {
        if (!instanceId) return;
        dispatch(setCurrentInput({
            instanceId,
            input: value,
        }));
    }, [instanceId, dispatch]);

    const handleSubmitOnEnterChange = useCallback((value: boolean) => {
        setSubmitOnEnter(value);
    }, []);

    const handleCopyResponse = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(rawAIResponse);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }, [rawAIResponse]);

    const handleApplyChanges = () => {
        setState('applying');

        // Apply the changes
        onCodeChange(modifiedCode);

        setState('complete');

        // Close modal after a brief delay
        setTimeout(() => {
            onOpenChange(false);
        }, 1500);
    };

    const diffStats = modifiedCode ? getDiffStats(currentCode, modifiedCode) : null;

    // Get display variables (filter out ALL special variables as they're auto-managed)
    const displayVariables = filterOutSpecialVariables(
        cachedPrompt?.variableDefaults || []
    );

    return {
        state,
        setState,
        instance,
        cachedPrompt,
        variables,
        resources,
        setResources,
        expandedVariable,
        setExpandedVariable,
        parsedEdits,
        modifiedCode,
        errorMessage,
        rawAIResponse,
        isCopied,
        selectedBuiltinId,
        setSelectedBuiltinId,
        submitOnEnter,
        isExecuting,
        isLoadingPrompt,
        diffStats,
        displayVariables,
        language,
        streamingText,
        handleSubmit,
        handleVariableValueChange,
        handleChatInputChange,
        handleSubmitOnEnterChange,
        handleCopyResponse,
        handleApplyChanges,
    };
}
