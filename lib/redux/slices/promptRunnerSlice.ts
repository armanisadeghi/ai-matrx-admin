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
  // Active modal configuration
  activeModal: {
    isOpen: boolean;
    config: PromptRunnerModalConfig | null;
    taskId: string | null; // Track Socket.IO task ID for execution
    openedAt: number | null; // Timestamp when opened (for analytics/debugging)
  };
  
  // Future: Support multiple modals
  // modals: {
  //   [modalId: string]: {
  //     isOpen: boolean;
  //     config: PromptRunnerModalConfig;
  //     taskId: string | null;
  //   };
  // };
}

const initialState: PromptRunnerState = {
  activeModal: {
    isOpen: false,
    config: null,
    taskId: null,
    openedAt: null,
  },
};

const promptRunnerSlice = createSlice({
  name: 'promptRunner',
  initialState,
  reducers: {
    // Open prompt runner modal with configuration
    openPromptModal: (state, action: PayloadAction<PromptRunnerModalConfig>) => {
      state.activeModal = {
        isOpen: true,
        config: action.payload,
        taskId: null, // Will be set when execution starts
        openedAt: Date.now(),
      };
    },

    // Close active modal
    closePromptModal: (state) => {
      state.activeModal = {
        isOpen: false,
        config: null,
        taskId: null,
        openedAt: null,
      };
    },

    // Update task ID when execution starts
    setPromptTaskId: (state, action: PayloadAction<string>) => {
      if (state.activeModal.isOpen) {
        state.activeModal.taskId = action.payload;
      }
    },

    // Update modal configuration (for dynamic updates)
    updatePromptConfig: (state, action: PayloadAction<Partial<PromptRunnerModalConfig>>) => {
      if (state.activeModal.config) {
        state.activeModal.config = {
          ...state.activeModal.config,
          ...action.payload,
        };
      }
    },
  },
});

// Selectors
export const selectIsPromptModalOpen = (state: RootState) =>
  state.promptRunner?.activeModal?.isOpen || false;

export const selectPromptModalConfig = (state: RootState) =>
  state.promptRunner?.activeModal?.config || null;

export const selectPromptModalTaskId = (state: RootState) =>
  state.promptRunner?.activeModal?.taskId || null;

export const selectActivePromptModal = (state: RootState) =>
  state.promptRunner?.activeModal || null;

export const {
  openPromptModal,
  closePromptModal,
  setPromptTaskId,
  updatePromptConfig,
} = promptRunnerSlice.actions;

export default promptRunnerSlice.reducer;

