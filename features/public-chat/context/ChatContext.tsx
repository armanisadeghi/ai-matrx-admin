'use client';

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// TYPES
// ============================================================================

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    status: 'pending' | 'sending' | 'streaming' | 'complete' | 'error';
    files?: string[];
    variables?: Record<string, any>;
}

export interface ChatSettings {
    searchEnabled: boolean;
    thinkEnabled: boolean;
    planEnabled: boolean;
    audioEnabled: boolean;
    enableAskQuestions: boolean;
    toolsEnabled: boolean;
}

export interface AgentConfig {
    promptId: string;
    name: string;
    description?: string;
    variables?: Array<{
        name: string;
        type: string;
        required: boolean;
        default?: any;
        description?: string;
    }>;
}

export interface ChatState {
    conversationId: string;
    messages: ChatMessage[];
    isStreaming: boolean;
    isExecuting: boolean;
    error: { type: string; message: string } | null;
    currentAgent: AgentConfig | null;
    settings: ChatSettings;
    modelOverride?: string;
    authToken: string | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    useLocalhost: boolean;
}

// ============================================================================
// ACTIONS
// ============================================================================

type ChatAction =
    | { type: 'SET_AUTH'; payload: { token: string | null; isAuthenticated: boolean; isAdmin?: boolean } }
    | { type: 'SET_AGENT'; payload: AgentConfig }
    | { type: 'ADD_MESSAGE'; payload: ChatMessage }
    | { type: 'UPDATE_MESSAGE'; payload: { id: string; updates: Partial<ChatMessage> } }
    | { type: 'SET_STREAMING'; payload: boolean }
    | { type: 'SET_EXECUTING'; payload: boolean }
    | { type: 'SET_ERROR'; payload: { type: string; message: string } | null }
    | { type: 'UPDATE_SETTINGS'; payload: Partial<ChatSettings> }
    | { type: 'SET_MODEL_OVERRIDE'; payload: string | undefined }
    | { type: 'CLEAR_MESSAGES' }
    | { type: 'START_NEW_CONVERSATION' }
    | { type: 'APPEND_TO_LAST_MESSAGE'; payload: string }
    | { type: 'SET_USE_LOCALHOST'; payload: boolean };

// ============================================================================
// INITIAL STATE
// ============================================================================

const defaultSettings: ChatSettings = {
    searchEnabled: false,
    thinkEnabled: false,
    planEnabled: false,
    audioEnabled: false,
    enableAskQuestions: false,
    toolsEnabled: false,
};

const createInitialState = (): ChatState => ({
    conversationId: uuidv4(),
    messages: [],
    isStreaming: false,
    isExecuting: false,
    error: null,
    currentAgent: null,
    settings: defaultSettings,
    modelOverride: undefined,
    authToken: null,
    isAuthenticated: false,
    isAdmin: false,
    useLocalhost: typeof window !== 'undefined' 
        ? localStorage.getItem('admin_use_localhost') === 'true' 
        : false,
});

// ============================================================================
// REDUCER
// ============================================================================

function chatReducer(state: ChatState, action: ChatAction): ChatState {
    switch (action.type) {
        case 'SET_AUTH':
            return {
                ...state,
                authToken: action.payload.token,
                isAuthenticated: action.payload.isAuthenticated,
                isAdmin: action.payload.isAdmin ?? state.isAdmin,
            };

        case 'SET_USE_LOCALHOST':
            // Persist to localStorage
            if (typeof window !== 'undefined') {
                localStorage.setItem('admin_use_localhost', String(action.payload));
            }
            return { ...state, useLocalhost: action.payload };

        case 'SET_AGENT':
            return {
                ...state,
                currentAgent: action.payload,
            };

        case 'ADD_MESSAGE':
            return {
                ...state,
                messages: [...state.messages, action.payload],
            };

        case 'UPDATE_MESSAGE':
            return {
                ...state,
                messages: state.messages.map((msg) =>
                    msg.id === action.payload.id
                        ? { ...msg, ...action.payload.updates }
                        : msg
                ),
            };

        case 'APPEND_TO_LAST_MESSAGE': {
            const messages = [...state.messages];
            const lastIndex = messages.length - 1;
            if (lastIndex >= 0 && messages[lastIndex].role === 'assistant') {
                messages[lastIndex] = {
                    ...messages[lastIndex],
                    content: messages[lastIndex].content + action.payload,
                };
            }
            return { ...state, messages };
        }

        case 'SET_STREAMING':
            return { ...state, isStreaming: action.payload };

        case 'SET_EXECUTING':
            return { ...state, isExecuting: action.payload };

        case 'SET_ERROR':
            return { ...state, error: action.payload };

        case 'UPDATE_SETTINGS':
            return {
                ...state,
                settings: { ...state.settings, ...action.payload },
            };

        case 'SET_MODEL_OVERRIDE':
            return { ...state, modelOverride: action.payload };

        case 'CLEAR_MESSAGES':
            return { ...state, messages: [] };

        case 'START_NEW_CONVERSATION':
            return {
                ...state,
                conversationId: uuidv4(),
                messages: [],
                error: null,
            };

        default:
            return state;
    }
}

// ============================================================================
// CONTEXT
// ============================================================================

interface ChatContextValue {
    state: ChatState;
    dispatch: React.Dispatch<ChatAction>;
    // Convenience actions
    setAuth: (token: string | null, isAuthenticated: boolean, isAdmin?: boolean) => void;
    setAgent: (agent: AgentConfig) => void;
    addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
    updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
    appendToLastMessage: (content: string) => void;
    setStreaming: (streaming: boolean) => void;
    setExecuting: (executing: boolean) => void;
    setError: (error: { type: string; message: string } | null) => void;
    updateSettings: (settings: Partial<ChatSettings>) => void;
    setModelOverride: (model: string | undefined) => void;
    clearMessages: () => void;
    startNewConversation: () => void;
    setUseLocalhost: (useLocalhost: boolean) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface ChatProviderProps {
    children: ReactNode;
    initialAgent?: AgentConfig;
}

export function ChatProvider({ children, initialAgent }: ChatProviderProps) {
    const [state, dispatch] = useReducer(chatReducer, undefined, () => {
        const initial = createInitialState();
        if (initialAgent) {
            initial.currentAgent = initialAgent;
        }
        return initial;
    });

    const setAuth = useCallback((token: string | null, isAuthenticated: boolean, isAdmin?: boolean) => {
        dispatch({ type: 'SET_AUTH', payload: { token, isAuthenticated, isAdmin } });
    }, []);

    const setUseLocalhost = useCallback((useLocalhost: boolean) => {
        dispatch({ type: 'SET_USE_LOCALHOST', payload: useLocalhost });
    }, []);

    const setAgent = useCallback((agent: AgentConfig) => {
        dispatch({ type: 'SET_AGENT', payload: agent });
    }, []);

    const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>): string => {
        const id = uuidv4();
        dispatch({
            type: 'ADD_MESSAGE',
            payload: { ...message, id, timestamp: new Date() },
        });
        return id;
    }, []);

    const updateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
        dispatch({ type: 'UPDATE_MESSAGE', payload: { id, updates } });
    }, []);

    const appendToLastMessage = useCallback((content: string) => {
        dispatch({ type: 'APPEND_TO_LAST_MESSAGE', payload: content });
    }, []);

    const setStreaming = useCallback((streaming: boolean) => {
        dispatch({ type: 'SET_STREAMING', payload: streaming });
    }, []);

    const setExecuting = useCallback((executing: boolean) => {
        dispatch({ type: 'SET_EXECUTING', payload: executing });
    }, []);

    const setError = useCallback((error: { type: string; message: string } | null) => {
        dispatch({ type: 'SET_ERROR', payload: error });
    }, []);

    const updateSettings = useCallback((settings: Partial<ChatSettings>) => {
        dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
    }, []);

    const setModelOverride = useCallback((model: string | undefined) => {
        dispatch({ type: 'SET_MODEL_OVERRIDE', payload: model });
    }, []);

    const clearMessages = useCallback(() => {
        dispatch({ type: 'CLEAR_MESSAGES' });
    }, []);

    const startNewConversation = useCallback(() => {
        dispatch({ type: 'START_NEW_CONVERSATION' });
    }, []);

    const value: ChatContextValue = {
        state,
        dispatch,
        setAuth,
        setAgent,
        addMessage,
        updateMessage,
        appendToLastMessage,
        setStreaming,
        setExecuting,
        setError,
        updateSettings,
        setModelOverride,
        clearMessages,
        startNewConversation,
        setUseLocalhost,
    };

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

// ============================================================================
// HOOKS
// ============================================================================

export function useChatContext() {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChatContext must be used within a ChatProvider');
    }
    return context;
}

export function useChatState() {
    const { state } = useChatContext();
    return state;
}

export function useChatActions() {
    const {
        setAuth,
        setAgent,
        addMessage,
        updateMessage,
        appendToLastMessage,
        setStreaming,
        setExecuting,
        setError,
        updateSettings,
        setModelOverride,
        clearMessages,
        startNewConversation,
        setUseLocalhost,
    } = useChatContext();

    return {
        setAuth,
        setAgent,
        addMessage,
        updateMessage,
        appendToLastMessage,
        setStreaming,
        setExecuting,
        setError,
        updateSettings,
        setModelOverride,
        clearMessages,
        startNewConversation,
        setUseLocalhost,
    };
}
