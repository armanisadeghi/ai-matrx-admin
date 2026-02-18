import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/lib/redux/store';
import type { ReactNode } from 'react';

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
  | 'code_preview'
  | 'code_edit_error'
  | 'progress'
  | 'math_problem';

export interface CanvasContent {
  type: CanvasContentType;
  data: any; // Flexible data structure - each block handles its own data
  metadata?: {
    title?: string | ReactNode;
    subtitle?: string | ReactNode;
    sourceMessageId?: string;
    sourceTaskId?: string;
  };
}

interface CanvasItem {
  id: string; // Unique ID for each canvas item
  content: CanvasContent;
  timestamp: number; // When it was created
  sourceMessageId?: string; // Link to the message that created it
  sourceTaskId?: string; // Link to the task that created it (for deduplication)
  savedItemId?: string; // Database ID if saved to Supabase
  isSynced?: boolean; // Whether this item is saved to the database
}

export type CanvasRenderMode = 'inline' | 'global' | 'auto';

interface CanvasState {
  isOpen: boolean;
  items: CanvasItem[]; // List of all canvas items in current session
  currentItemId: string | null; // Currently active item
  isAvailable: boolean; // Whether canvas is available in current context/layout
  canvasWidth: number; // Width of canvas panel in pixels (persisted)
  renderMode: CanvasRenderMode; // Preferred render mode
}

const initialState: CanvasState = {
  isOpen: false,
  items: [],
  currentItemId: null,
  isAvailable: false, // Default to false, layouts enable it
  canvasWidth: 800, // Default width - canvas gets priority (750px when there's enough room)
  renderMode: 'auto', // Auto-detect best render mode
};

export const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    // Add a new canvas item and make it active (with deduplication)
    openCanvas: (state, action: PayloadAction<CanvasContent>) => {
      const sourceTaskId = action.payload.metadata?.sourceTaskId;
      const sourceMessageId = action.payload.metadata?.sourceMessageId;
      
      // DEDUPLICATION: Check if an item from this source already exists
      // Priority: taskId > messageId (taskId is more specific)
      let existingItem: CanvasItem | undefined;
      
      if (sourceTaskId) {
        // Check by taskId first (most specific identifier)
        existingItem = state.items.find(item => item.sourceTaskId === sourceTaskId);
      } else if (sourceMessageId) {
        // Fallback to messageId if no taskId
        existingItem = state.items.find(item => 
          item.sourceMessageId === sourceMessageId && !item.sourceTaskId
        );
      }
      
      if (existingItem) {
        // Item already exists - just switch to it and reopen
        state.currentItemId = existingItem.id;
        state.isOpen = true;
        // Update timestamp to mark as recently accessed
        existingItem.timestamp = Date.now();
        return;
      }
      
      // No existing item - create new one
      const newItem: CanvasItem = {
        id: `canvas-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content: action.payload,
        timestamp: Date.now(),
        sourceMessageId,
        sourceTaskId,
      };
      
      state.items.push(newItem);
      state.currentItemId = newItem.id;
      state.isOpen = true;
    },
    
    // Close canvas but keep history
    closeCanvas: (state) => {
      state.isOpen = false;
      // Keep items and currentItemId for reopen
    },
    
    // Clear all canvas history
    clearCanvas: (state) => {
      state.isOpen = false;
      state.items = [];
      state.currentItemId = null;
    },
    
    // Switch to a different canvas item
    setCurrentItem: (state, action: PayloadAction<string>) => {
      const itemExists = state.items.some(item => item.id === action.payload);
      if (itemExists) {
        state.currentItemId = action.payload;
        state.isOpen = true;
      }
    },
    
    // Remove a specific canvas item
    removeCanvasItem: (state, action: PayloadAction<string>) => {
      const itemIndex = state.items.findIndex(item => item.id === action.payload);
      if (itemIndex !== -1) {
        state.items.splice(itemIndex, 1);
        
        // If we removed the current item, switch to the last one or close
        if (state.currentItemId === action.payload) {
          if (state.items.length > 0) {
            state.currentItemId = state.items[state.items.length - 1].id;
          } else {
            state.currentItemId = null;
            state.isOpen = false;
          }
        }
      }
    },
    
    // Update existing canvas item content
    updateCanvasContent: (state, action: PayloadAction<{ id?: string; content: CanvasContent }>) => {
      const { id, content } = action.payload;
      
      // If ID provided, update that specific item
      if (id) {
        const item = state.items.find(item => item.id === id);
        if (item) {
          item.content = content;
          // Mark as not synced if content changes
          item.isSynced = false;
        }
      } else if (state.currentItemId) {
        // Update current item
        const item = state.items.find(item => item.id === state.currentItemId);
        if (item) {
          item.content = content;
          // Mark as not synced if content changes
          item.isSynced = false;
        }
      } else {
        // No current item, create new one
        const newItem: CanvasItem = {
          id: `canvas-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content,
          timestamp: Date.now(),
          sourceMessageId: content.metadata?.sourceMessageId,
          isSynced: false,
        };
        state.items.push(newItem);
        state.currentItemId = newItem.id;
      }
      
      state.isOpen = true;
    },
    
    // Mark an item as synced to database
    markItemSynced: (state, action: PayloadAction<{ canvasItemId: string; savedItemId: string }>) => {
      const { canvasItemId, savedItemId } = action.payload;
      const item = state.items.find(item => item.id === canvasItemId);
      if (item) {
        item.savedItemId = savedItemId;
        item.isSynced = true;
      }
    },
    
    // Mark an item as not synced (e.g., after edit)
    markItemUnsynced: (state, action: PayloadAction<string>) => {
      const item = state.items.find(item => item.id === action.payload);
      if (item) {
        item.isSynced = false;
      }
    },
    
    // Set canvas availability (called by layouts that support canvas)
    setCanvasAvailable: (state, action: PayloadAction<boolean>) => {
      state.isAvailable = action.payload;
    },
    
    // Set canvas width (for persistence)
    setCanvasWidth: (state, action: PayloadAction<number>) => {
      state.canvasWidth = action.payload;
    },
    
    // Set preferred render mode
    setCanvasRenderMode: (state, action: PayloadAction<CanvasRenderMode>) => {
      state.renderMode = action.payload;
    },
  },
});

// Actions
export const {
  openCanvas,
  closeCanvas,
  clearCanvas,
  setCurrentItem,
  removeCanvasItem,
  updateCanvasContent,
  markItemSynced,
  markItemUnsynced,
  setCanvasAvailable,
  setCanvasWidth,
  setCanvasRenderMode,
} = canvasSlice.actions;

// Selectors — use optional chaining so these work safely with the lite Redux store
// (public routes use LiteStoreProvider which doesn't include the canvas slice)
export const selectCanvasIsOpen = (state: RootState) => state.canvas?.isOpen ?? false;
export const selectCanvasItems = (state: RootState) => state.canvas?.items ?? [];
export const selectCurrentItemId = (state: RootState) => state.canvas?.currentItemId ?? null;
export const selectCanvasIsAvailable = (state: RootState) => state.canvas?.isAvailable ?? false;

// Get the currently active canvas item
export const selectCurrentCanvasItem = (state: RootState): CanvasItem | null => {
  if (!state.canvas) return null;
  const { items, currentItemId } = state.canvas;
  if (!currentItemId) return null;
  return items.find(item => item.id === currentItemId) || null;
};

// Get current canvas content (for backward compatibility)
export const selectCanvasContent = (state: RootState): CanvasContent | null => {
  const currentItem = selectCurrentCanvasItem(state);
  return currentItem?.content || null;
};

// Get canvas count
export const selectCanvasCount = (state: RootState) => state.canvas?.items?.length ?? 0;

// Get canvas width
export const selectCanvasWidth = (state: RootState) => state.canvas?.canvasWidth ?? 400;

// Get canvas render mode
export const selectCanvasRenderMode = (state: RootState) => state.canvas?.renderMode ?? 'panel';

// Export types
export type { CanvasItem };

export default canvasSlice.reducer;

