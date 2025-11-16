// lib/redux/slices/promptRunnerSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { PromptRunnerModalConfig } from '@/features/prompts/types/modal';

/**
 * Prompt Runner Slice
 * 
 * Manages the active PromptRunnerModal state globally via Redux.
 * Allows opening prompts from anywhere without rendering modals in every component.
 * 
 * Architecture supports multiple modals in future, but starts with single active modal.
 */

export interface PromptRunnerState {
  // Full modal (modal-full)
  activeModal: {
    isOpen: boolean;
    config: PromptRunnerModalConfig | null;
    taskId: string | null;
    openedAt: number | null;
  };
  
  // Compact modal (modal-compact)
  compactModal: {
    isOpen: boolean;
    config: PromptRunnerModalConfig | null;
    taskId: string | null;
    openedAt: number | null;
  };
  
  // Inline overlay (inline)
  inlineOverlay: {
    isOpen: boolean;
    result: string | null;
    taskId: string | null;
    originalText: string | null;
    promptName: string | null;
    isStreaming: boolean;
    callbacks: {
      onReplace?: (text: string) => void;
      onInsertBefore?: (text: string) => void;
      onInsertAfter?: (text: string) => void;
    } | null;
  };
  
  // Sidebar result (sidebar)
  sidebarResult: {
    isOpen: boolean;
    config: PromptRunnerModalConfig | null;
    taskId: string | null;
    position: 'left' | 'right';
    size: 'sm' | 'md' | 'lg';
    openedAt: number | null;
  };
  
  // Toast notification (toast)
  toastQueue: Array<{
    id: string;
    result: string;
    promptName: string | null;
    duration: number;
    createdAt: number;
    promptData?: any;
    executionConfig?: any;
    taskId?: string;
  }>;
}

const initialState: PromptRunnerState = {
  activeModal: {
    isOpen: false,
    config: null,
    taskId: null,
    openedAt: null,
  },
  compactModal: {
    isOpen: false,
    config: null,
    taskId: null,
    openedAt: null,
  },
  inlineOverlay: {
    isOpen: false,
    result: null,
    taskId: null,
    originalText: null,
    promptName: null,
    isStreaming: false,
    callbacks: null,
  },
  sidebarResult: {
    isOpen: false,
    config: null,
    taskId: null,
    position: 'right',
    size: 'md',
    openedAt: null,
  },
  toastQueue: [],
};

const promptRunnerSlice = createSlice({
  name: 'promptRunner',
  initialState,
  reducers: {
    // ========== MODAL-FULL ==========
    openPromptModal: (state, action: PayloadAction<PromptRunnerModalConfig>) => {
      state.activeModal = {
        isOpen: true,
        config: action.payload,
        taskId: null,
        openedAt: Date.now(),
      };
    },
    closePromptModal: (state) => {
      state.activeModal = {
        isOpen: false,
        config: null,
        taskId: null,
        openedAt: null,
      };
    },
    setPromptTaskId: (state, action: PayloadAction<string>) => {
      if (state.activeModal.isOpen) {
        state.activeModal.taskId = action.payload;
      }
    },
    updatePromptConfig: (state, action: PayloadAction<Partial<PromptRunnerModalConfig>>) => {
      if (state.activeModal.config) {
        state.activeModal.config = {
          ...state.activeModal.config,
          ...action.payload,
        };
      }
    },

    // ========== MODAL-COMPACT ==========
    openCompactModal: (state, action: PayloadAction<PromptRunnerModalConfig>) => {
      state.compactModal = {
        isOpen: true,
        config: action.payload,
        taskId: null,
        openedAt: Date.now(),
      };
    },
    closeCompactModal: (state) => {
      state.compactModal = {
        isOpen: false,
        config: null,
        taskId: null,
        openedAt: null,
      };
    },
    setCompactTaskId: (state, action: PayloadAction<string>) => {
      if (state.compactModal.isOpen) {
        state.compactModal.taskId = action.payload;
      }
    },

    // ========== INLINE OVERLAY ==========
    openInlineOverlay: (state, action: PayloadAction<{
      result?: string;
      taskId?: string;
      originalText: string;
      promptName: string | null;
      isStreaming?: boolean;
      callbacks: {
        onReplace?: (text: string) => void;
        onInsertBefore?: (text: string) => void;
        onInsertAfter?: (text: string) => void;
      };
    }>) => {
      state.inlineOverlay = {
        isOpen: true,
        result: action.payload.result || null,
        taskId: action.payload.taskId || null,
        originalText: action.payload.originalText,
        promptName: action.payload.promptName,
        isStreaming: action.payload.isStreaming || false,
        callbacks: action.payload.callbacks,
      };
    },
    closeInlineOverlay: (state) => {
      state.inlineOverlay = {
        isOpen: false,
        result: null,
        taskId: null,
        originalText: null,
        promptName: null,
        isStreaming: false,
        callbacks: null,
      };
    },
    updateInlineResult: (state, action: PayloadAction<string>) => {
      if (state.inlineOverlay.isOpen) {
        state.inlineOverlay.result = action.payload;
      }
    },
    setInlineStreaming: (state, action: PayloadAction<boolean>) => {
      if (state.inlineOverlay.isOpen) {
        state.inlineOverlay.isStreaming = action.payload;
      }
    },

    // ========== SIDEBAR ==========
    openSidebarResult: (state, action: PayloadAction<{
      config: PromptRunnerModalConfig;
      position?: 'left' | 'right';
      size?: 'sm' | 'md' | 'lg';
    }>) => {
      state.sidebarResult = {
        isOpen: true,
        config: action.payload.config,
        taskId: null,
        position: action.payload.position || 'right',
        size: action.payload.size || 'md',
        openedAt: Date.now(),
      };
    },
    closeSidebarResult: (state) => {
      state.sidebarResult = {
        isOpen: false,
        config: null,
        taskId: null,
        position: 'right',
        size: 'md',
        openedAt: null,
      };
    },
    setSidebarTaskId: (state, action: PayloadAction<string>) => {
      if (state.sidebarResult.isOpen) {
        state.sidebarResult.taskId = action.payload;
      }
    },
    updateSidebarPosition: (state, action: PayloadAction<'left' | 'right'>) => {
      if (state.sidebarResult.isOpen) {
        state.sidebarResult.position = action.payload;
      }
    },
    updateSidebarSize: (state, action: PayloadAction<'sm' | 'md' | 'lg'>) => {
      if (state.sidebarResult.isOpen) {
        state.sidebarResult.size = action.payload;
      }
    },

    // ========== TOAST ==========
    addToastResult: (state, action: PayloadAction<{
      result: string;
      promptName: string | null;
      duration?: number;
      promptData?: any;
      executionConfig?: any;
      taskId?: string;
    }>) => {
      state.toastQueue.push({
        id: `toast-${Date.now()}-${Math.random()}`,
        result: action.payload.result,
        promptName: action.payload.promptName,
        duration: action.payload.duration || 5000,
        createdAt: Date.now(),
        promptData: action.payload.promptData,
        executionConfig: action.payload.executionConfig,
        taskId: action.payload.taskId,
      });
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toastQueue = state.toastQueue.filter(t => t.id !== action.payload);
    },
    clearAllToasts: (state) => {
      state.toastQueue = [];
    },
  },
});

// ========== SELECTORS ==========

// Modal-Full
export const selectIsPromptModalOpen = (state: RootState) =>
  state.promptRunner?.activeModal?.isOpen || false;
export const selectPromptModalConfig = (state: RootState) =>
  state.promptRunner?.activeModal?.config || null;
export const selectPromptModalTaskId = (state: RootState) =>
  state.promptRunner?.activeModal?.taskId || null;
export const selectActivePromptModal = (state: RootState) =>
  state.promptRunner?.activeModal || null;

// Modal-Compact
export const selectIsCompactModalOpen = (state: RootState) =>
  state.promptRunner?.compactModal?.isOpen || false;
export const selectCompactModalConfig = (state: RootState) =>
  state.promptRunner?.compactModal?.config || null;
export const selectCompactModalTaskId = (state: RootState) =>
  state.promptRunner?.compactModal?.taskId || null;

// Inline Overlay
export const selectIsInlineOverlayOpen = (state: RootState) =>
  state.promptRunner?.inlineOverlay?.isOpen || false;
export const selectInlineOverlayData = (state: RootState) =>
  state.promptRunner?.inlineOverlay || null;
export const selectInlineResult = (state: RootState) =>
  state.promptRunner?.inlineOverlay?.result || null;
export const selectInlineIsStreaming = (state: RootState) =>
  state.promptRunner?.inlineOverlay?.isStreaming || false;

// Sidebar
export const selectIsSidebarResultOpen = (state: RootState) =>
  state.promptRunner?.sidebarResult?.isOpen || false;
export const selectSidebarResultConfig = (state: RootState) =>
  state.promptRunner?.sidebarResult?.config || null;
export const selectSidebarPosition = (state: RootState) =>
  state.promptRunner?.sidebarResult?.position || 'right';
export const selectSidebarSize = (state: RootState) =>
  state.promptRunner?.sidebarResult?.size || 'md';
export const selectSidebarTaskId = (state: RootState) =>
  state.promptRunner?.sidebarResult?.taskId || null;

// Toast
export const selectToastQueue = (state: RootState) =>
  state.promptRunner?.toastQueue || [];
export const selectHasActiveToasts = (state: RootState) =>
  (state.promptRunner?.toastQueue?.length || 0) > 0;

// ========== ACTIONS EXPORT ==========
export const {
  // Modal-Full
  openPromptModal,
  closePromptModal,
  setPromptTaskId,
  updatePromptConfig,
  // Modal-Compact
  openCompactModal,
  closeCompactModal,
  setCompactTaskId,
  // Inline
  openInlineOverlay,
  closeInlineOverlay,
  updateInlineResult,
  setInlineStreaming,
  // Sidebar
  openSidebarResult,
  closeSidebarResult,
  setSidebarTaskId,
  updateSidebarPosition,
  updateSidebarSize,
  // Toast
  addToastResult,
  removeToast,
  clearAllToasts,
} = promptRunnerSlice.actions;

export default promptRunnerSlice.reducer;

