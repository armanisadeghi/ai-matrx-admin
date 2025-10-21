import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';

// Supported canvas content types
export type CanvasContentType = 
  | 'quiz'
  | 'presentation'
  | 'iframe'
  | 'html'
  | 'code'
  | 'image'
  | 'diagram'
  | 'comparison'
  | 'timeline'
  | 'research'
  | 'troubleshooting'
  | 'decision-tree'
  | 'flashcards'
  | 'recipe'
  | 'resources'
  | 'progress';

export interface CanvasContent {
  type: CanvasContentType;
  data: any; // Flexible data structure - each block handles its own data
  metadata?: {
    title?: string;
    sourceMessageId?: string;
    sourceTaskId?: string;
  };
}

interface CanvasState {
  isOpen: boolean;
  content: CanvasContent | null;
  width: number; // Canvas width in pixels (adjustable by user)
}

const initialState: CanvasState = {
  isOpen: false,
  content: null,
  width: 800, // Default canvas width - generous starting size
};

export const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    openCanvas: (state, action: PayloadAction<CanvasContent>) => {
      state.isOpen = true;
      state.content = action.payload;
    },
    closeCanvas: (state) => {
      state.isOpen = false;
      // Keep content for potential reopen
    },
    clearCanvas: (state) => {
      state.isOpen = false;
      state.content = null;
    },
    updateCanvasContent: (state, action: PayloadAction<CanvasContent>) => {
      state.content = action.payload;
      // Ensure canvas is open when content is updated
      if (!state.isOpen) {
        state.isOpen = true;
      }
    },
    setCanvasWidth: (state, action: PayloadAction<number>) => {
      state.width = action.payload;
    },
  },
});

// Actions
export const {
  openCanvas,
  closeCanvas,
  clearCanvas,
  updateCanvasContent,
  setCanvasWidth,
} = canvasSlice.actions;

// Selectors
export const selectCanvasIsOpen = (state: RootState) => state.canvas.isOpen;
export const selectCanvasContent = (state: RootState) => state.canvas.content;
export const selectCanvasWidth = (state: RootState) => state.canvas.width;

export default canvasSlice.reducer;

