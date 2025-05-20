// lib/redux/slices/overlaySlice.ts

import { createSlice } from '@reduxjs/toolkit';
import { RootState } from '../store';

// Define interface for overlay state
export interface OverlayState {
  overlays: {
    [key: string]: {
      isOpen: boolean;
      data: any;
    };
  };
}

const initialState: OverlayState = {
  overlays: {
    brokerState: { isOpen: false, data: null },
    markdownEditor: { isOpen: false, data: null },
    socketAccordion: { isOpen: false, data: null },
    adminStateAnalyzer: { isOpen: false, data: null },
    // ... other overlays
  },
};

const overlaySlice = createSlice({
  name: 'overlays',
  initialState,
  reducers: {
    openOverlay: (state, action) => {
      const { overlayId, data } = action.payload;
      state.overlays[overlayId] = { 
        isOpen: true, 
        data: data || null 
      };
    },
    closeOverlay: (state, action) => {
      const { overlayId } = action.payload;
      if (state.overlays[overlayId]) {
        state.overlays[overlayId].isOpen = false;
        state.overlays[overlayId].data = null;
      }
    },
    closeAllOverlays: (state) => {
      Object.keys(state.overlays).forEach(key => {
        state.overlays[key].isOpen = false;
        state.overlays[key].data = null;
      });
    },
    toggleOverlay: (state, action) => {
      const { overlayId, data } = action.payload;
      if (!state.overlays[overlayId]) {
        state.overlays[overlayId] = { isOpen: true, data: data || null };
      } else {
        state.overlays[overlayId].isOpen = !state.overlays[overlayId].isOpen;
        state.overlays[overlayId].data = state.overlays[overlayId].isOpen ? (data || state.overlays[overlayId].data) : null;
      }
    }
  },
});

// Selectors
export const selectOverlay = (state: RootState, overlayId: string) => 
  state.overlays.overlays[overlayId] || { isOpen: false, data: null };

export const selectIsOverlayOpen = (state: RootState, overlayId: string) => 
  selectOverlay(state, overlayId).isOpen;

export const selectOverlayData = (state: RootState, overlayId: string) =>
  selectOverlay(state, overlayId).data;

export const { openOverlay, closeOverlay, closeAllOverlays, toggleOverlay } = overlaySlice.actions;
export default overlaySlice.reducer;

