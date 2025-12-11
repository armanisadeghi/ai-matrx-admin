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
    runId: string | null; // Added runId for unified system
    taskId: string | null;
    openedAt: number | null;
  };
  
  // Compact modal (modal-compact)
  compactModal: {
    isOpen: boolean;
    config: PromptRunnerModalConfig | null;
    runId: string | null; // Added runId for unified system
    taskId: string | null;
    openedAt: number | null;
  };
  
  // Inline overlay (inline)
  inlineOverlay: {
    isOpen: boolean;
    result: string | null;
    runId: string | null; // Added runId for unified system
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
    runId: string | null; // Added runId for unified system
    taskId: string | null;
    position: 'left' | 'right';
    size: 'sm' | 'md' | 'lg';
    openedAt: number | null;
  };
  
  // Flexible panel (flexible-panel) - Advanced resizable panel with position controls
  flexiblePanel: {
    isOpen: boolean;
    config: PromptRunnerModalConfig | null;
    runId: string | null; // Added runId for unified system
    taskId: string | null;
    position: 'left' | 'right' | 'top' | 'bottom';
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
    runId?: string; // Added runId for unified system
    taskId?: string;
    isStreaming?: boolean;
  }>;
  
  // Pre-execution input modal (NEW)
  preExecutionModal: {
    isOpen: boolean;
    config: PromptRunnerModalConfig | null;
    targetResultDisplay: string | null; // Where to go after submission (ResultDisplay type)
  };
}

const initialState: PromptRunnerState = {
  activeModal: {
    isOpen: false,
    config: null,
    runId: null,
    taskId: null,
    openedAt: null,
  },
  compactModal: {
    isOpen: false,
    config: null,
    runId: null,
    taskId: null,
    openedAt: null,
  },
  inlineOverlay: {
    isOpen: false,
    result: null,
    runId: null,
    taskId: null,
    originalText: null,
    promptName: null,
    isStreaming: false,
    callbacks: null,
  },
  sidebarResult: {
    isOpen: false,
    config: null,
    runId: null,
    taskId: null,
    position: 'right',
    size: 'md',
    openedAt: null,
  },
  flexiblePanel: {
    isOpen: false,
    config: null,
    runId: null,
    taskId: null,
    position: 'right',
    openedAt: null,
  },
  toastQueue: [],
  preExecutionModal: {
    isOpen: false,
    config: null,
    targetResultDisplay: null,
  },
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
        runId: action.payload.runId || null, // Extract runId from config
        taskId: null,
        openedAt: Date.now(),
      };
    },
    closePromptModal: (state, action: PayloadAction<{ responseText?: string } | undefined>) => {
      // Save to recent results before closing (with response text for persistence)
      if (state.activeModal.config && state.activeModal.openedAt) {
        const responseText = action.payload?.responseText ?? '';
        
        const recent = {
          id: `result-${Date.now()}`,
          promptName: state.activeModal.config.promptData?.name || state.activeModal.config.title || 'Unknown Prompt',
          displayType: 'modal-full' as const,
          timestamp: state.activeModal.openedAt,
          runId: state.activeModal.runId, // Include runId for reference
          taskId: state.activeModal.taskId, // Keep taskId for reference
          responseText, // CRITICAL: Save actual response text for restore
          config: {
            ...state.activeModal.config,
            executionConfig: {
              ...state.activeModal.config.executionConfig,
              auto_run: false, // CRITICAL: Prevent re-execution on restore
            },
          },
        };
        
        // Save to session storage
        try {
          const existing = JSON.parse(sessionStorage.getItem('recentPromptResults') || '[]');
          const updated = [recent, ...existing].slice(0, 20); // Keep last 20
          sessionStorage.setItem('recentPromptResults', JSON.stringify(updated));
        } catch (e) {
          console.error('Failed to save recent result:', e);
        }
      }
      
      state.activeModal = {
        isOpen: false,
        config: null,
        runId: null,
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
        runId: action.payload.runId || null, // Extract runId from config
        taskId: (action.payload as any).taskId || null,
        openedAt: Date.now(),
      };
    },
    closeCompactModal: (state, action: PayloadAction<{ responseText?: string } | undefined>) => {
      // Save to recent results before closing (with response text for persistence)
      if (state.compactModal.config && state.compactModal.openedAt) {
        const responseText = action.payload?.responseText ?? '';
        
        const recent = {
          id: `result-${Date.now()}`,
          promptName: state.compactModal.config.promptData?.name || state.compactModal.config.title || 'Unknown Prompt',
          displayType: 'modal-compact' as const,
          timestamp: state.compactModal.openedAt,
          runId: state.compactModal.runId, // Include runId for reference
          taskId: state.compactModal.taskId, // Keep taskId for reference
          responseText, // CRITICAL: Save actual response text for restore
          config: {
            ...state.compactModal.config,
            executionConfig: {
              ...state.compactModal.config.executionConfig,
              auto_run: false, // CRITICAL: Prevent re-execution on restore
            },
          },
        };
        
        // Save to session storage
        try {
          const existing = JSON.parse(sessionStorage.getItem('recentPromptResults') || '[]');
          const updated = [recent, ...existing].slice(0, 20); // Keep last 20
          sessionStorage.setItem('recentPromptResults', JSON.stringify(updated));
        } catch (e) {
          console.error('Failed to save recent result:', e);
        }
      }
      
      state.compactModal = {
        isOpen: false,
        config: null,
        runId: null,
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
      runId?: string;
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
        runId: action.payload.runId || null, // Extract runId
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
        runId: null,
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
        runId: action.payload.config.runId || null, // Extract runId from config
        taskId: null,
        position: action.payload.position || 'right',
        size: action.payload.size || 'md',
        openedAt: Date.now(),
      };
    },
    closeSidebarResult: (state, action: PayloadAction<{ responseText?: string } | undefined>) => {
      // Save to recent results before closing (with response text for persistence)
      if (state.sidebarResult.config && state.sidebarResult.openedAt) {
        const responseText = action.payload?.responseText ?? '';
        
        const recent = {
          id: `result-${Date.now()}`,
          promptName: state.sidebarResult.config.promptData?.name || state.sidebarResult.config.title || 'Unknown Prompt',
          displayType: 'sidebar' as const,
          timestamp: state.sidebarResult.openedAt,
          runId: state.sidebarResult.runId, // Include runId for reference
          taskId: state.sidebarResult.taskId, // Keep taskId for reference
          responseText, // CRITICAL: Save actual response text for restore
          config: {
            ...state.sidebarResult.config,
            executionConfig: {
              ...state.sidebarResult.config.executionConfig,
              auto_run: false, // CRITICAL: Prevent re-execution on restore
            },
          },
        };
        
        // Save to session storage
        try {
          const existing = JSON.parse(sessionStorage.getItem('recentPromptResults') || '[]');
          const updated = [recent, ...existing].slice(0, 20); // Keep last 20
          sessionStorage.setItem('recentPromptResults', JSON.stringify(updated));
        } catch (e) {
          console.error('Failed to save recent result:', e);
        }
      }
      
      state.sidebarResult = {
        isOpen: false,
        config: null,
        runId: null,
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

    // ========== FLEXIBLE PANEL ==========
    openFlexiblePanel: (state, action: PayloadAction<{
      config: PromptRunnerModalConfig;
      position?: 'left' | 'right' | 'top' | 'bottom';
    }>) => {
      state.flexiblePanel = {
        isOpen: true,
        config: action.payload.config,
        runId: action.payload.config.runId || null, // Extract runId from config
        taskId: null,
        position: action.payload.position || 'right',
        openedAt: Date.now(),
      };
    },
    closeFlexiblePanel: (state, action: PayloadAction<{ responseText?: string } | undefined>) => {
      // Save to recent results before closing (with response text for persistence)
      if (state.flexiblePanel.config && state.flexiblePanel.openedAt) {
        const responseText = action.payload?.responseText ?? '';
        
        const recent = {
          id: `result-${Date.now()}`,
          promptName: state.flexiblePanel.config.promptData?.name || state.flexiblePanel.config.title || 'Unknown Prompt',
          displayType: 'flexible-panel' as const,
          timestamp: state.flexiblePanel.openedAt,
          runId: state.flexiblePanel.runId, // Include runId for reference
          taskId: state.flexiblePanel.taskId, // Keep taskId for reference
          responseText, // CRITICAL: Save actual response text for restore
          config: {
            ...state.flexiblePanel.config,
            executionConfig: {
              ...state.flexiblePanel.config.executionConfig,
              auto_run: false, // CRITICAL: Prevent re-execution on restore
            },
          },
        };
        
        // Save to session storage
        try {
          const existing = JSON.parse(sessionStorage.getItem('recentPromptResults') || '[]');
          const updated = [recent, ...existing].slice(0, 20); // Keep last 20
          sessionStorage.setItem('recentPromptResults', JSON.stringify(updated));
        } catch (e) {
          console.error('Failed to save recent result:', e);
        }
      }
      
      state.flexiblePanel = {
        isOpen: false,
        config: null,
        runId: null,
        taskId: null,
        position: 'right',
        openedAt: null,
      };
    },
    setFlexiblePanelTaskId: (state, action: PayloadAction<string>) => {
      if (state.flexiblePanel.isOpen) {
        state.flexiblePanel.taskId = action.payload;
      }
    },
    updateFlexiblePanelPosition: (state, action: PayloadAction<'left' | 'right' | 'top' | 'bottom'>) => {
      if (state.flexiblePanel.isOpen) {
        state.flexiblePanel.position = action.payload;
      }
    },

    // ========== TOAST ==========
    addToastResult: (state, action: PayloadAction<{
      result: string;
      promptName: string | null;
      duration?: number;
      promptData?: any;
      executionConfig?: any;
      runId?: string;
      taskId?: string;
      isStreaming?: boolean;
    }>) => {
      state.toastQueue.push({
        id: `toast-${Date.now()}-${Math.random()}`,
        result: action.payload.result,
        promptName: action.payload.promptName,
        duration: action.payload.duration || 5000,
        createdAt: Date.now(),
        promptData: action.payload.promptData,
        executionConfig: action.payload.executionConfig,
        runId: action.payload.runId, // Store runId
        taskId: action.payload.taskId,
        isStreaming: action.payload.isStreaming,
      });
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toastQueue = state.toastQueue.filter(t => t.id !== action.payload);
    },
    clearAllToasts: (state) => {
      state.toastQueue = [];
    },
    
    // ========== PRE-EXECUTION MODAL ==========
    openPreExecutionModal: (state, action: PayloadAction<{
      config: PromptRunnerModalConfig;
      targetResultDisplay: string;
    }>) => {
      state.preExecutionModal = {
        isOpen: true,
        config: action.payload.config,
        targetResultDisplay: action.payload.targetResultDisplay,
      };
    },
    closePreExecutionModal: (state) => {
      state.preExecutionModal = {
        isOpen: false,
        config: null,
        targetResultDisplay: null,
      };
    },
  },
});

// ========== SELECTORS ==========

// Modal-Full
export const selectIsPromptModalOpen = (state: RootState) =>
  state.promptRunner?.activeModal?.isOpen || false;
export const selectPromptModalConfig = (state: RootState) =>
  state.promptRunner?.activeModal?.config || null;
export const selectPromptModalRunId = (state: RootState) =>
  state.promptRunner?.activeModal?.runId || null;
export const selectPromptModalTaskId = (state: RootState) =>
  state.promptRunner?.activeModal?.taskId || null;
export const selectActivePromptModal = (state: RootState) =>
  state.promptRunner?.activeModal || null;

// Modal-Compact
export const selectIsCompactModalOpen = (state: RootState) =>
  state.promptRunner?.compactModal?.isOpen || false;
export const selectCompactModalConfig = (state: RootState) =>
  state.promptRunner?.compactModal?.config || null;
export const selectCompactModalRunId = (state: RootState) =>
  state.promptRunner?.compactModal?.runId || null;
export const selectCompactModalTaskId = (state: RootState) =>
  state.promptRunner?.compactModal?.taskId || null;

// Inline Overlay
export const selectIsInlineOverlayOpen = (state: RootState) =>
  state.promptRunner?.inlineOverlay?.isOpen || false;
export const selectInlineOverlayData = (state: RootState) =>
  state.promptRunner?.inlineOverlay || null;
export const selectInlineOverlayRunId = (state: RootState) =>
  state.promptRunner?.inlineOverlay?.runId || null;
export const selectInlineResult = (state: RootState) =>
  state.promptRunner?.inlineOverlay?.result || null;
export const selectInlineIsStreaming = (state: RootState) =>
  state.promptRunner?.inlineOverlay?.isStreaming || false;

// Sidebar
export const selectIsSidebarResultOpen = (state: RootState) =>
  state.promptRunner?.sidebarResult?.isOpen || false;
export const selectSidebarResultConfig = (state: RootState) =>
  state.promptRunner?.sidebarResult?.config || null;
export const selectSidebarResultRunId = (state: RootState) =>
  state.promptRunner?.sidebarResult?.runId || null;
export const selectSidebarPosition = (state: RootState) =>
  state.promptRunner?.sidebarResult?.position || 'right';
export const selectSidebarSize = (state: RootState) =>
  state.promptRunner?.sidebarResult?.size || 'md';
export const selectSidebarTaskId = (state: RootState) =>
  state.promptRunner?.sidebarResult?.taskId || null;

// Flexible Panel
export const selectIsFlexiblePanelOpen = (state: RootState) =>
  state.promptRunner?.flexiblePanel?.isOpen || false;
export const selectFlexiblePanelConfig = (state: RootState) =>
  state.promptRunner?.flexiblePanel?.config || null;
export const selectFlexiblePanelRunId = (state: RootState) =>
  state.promptRunner?.flexiblePanel?.runId || null;
export const selectFlexiblePanelPosition = (state: RootState) =>
  state.promptRunner?.flexiblePanel?.position || 'right';
export const selectFlexiblePanelTaskId = (state: RootState) =>
  state.promptRunner?.flexiblePanel?.taskId || null;

// Toast
export const selectToastQueue = (state: RootState) =>
  state.promptRunner?.toastQueue || [];
export const selectHasActiveToasts = (state: RootState) =>
  (state.promptRunner?.toastQueue?.length || 0) > 0;

// Pre-Execution Modal
export const selectIsPreExecutionModalOpen = (state: RootState) =>
  state.promptRunner?.preExecutionModal?.isOpen || false;
export const selectPreExecutionModalConfig = (state: RootState) =>
  state.promptRunner?.preExecutionModal?.config || null;
export const selectPreExecutionTargetDisplay = (state: RootState) =>
  state.promptRunner?.preExecutionModal?.targetResultDisplay || null;

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
  // Flexible Panel
  openFlexiblePanel,
  closeFlexiblePanel,
  setFlexiblePanelTaskId,
  updateFlexiblePanelPosition,
  // Toast
  addToastResult,
  removeToast,
  clearAllToasts,
  // Pre-Execution Modal
  openPreExecutionModal,
  closePreExecutionModal,
} = promptRunnerSlice.actions;

export default promptRunnerSlice.reducer;

