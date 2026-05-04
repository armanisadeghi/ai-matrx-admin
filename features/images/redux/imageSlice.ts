// features/images/redux/imageSlice.ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ImageTab, ImageViewMode, UploadQueueItem } from '../types';

interface ImageState {
  selectedImageId: string | null;
  activeTab: ImageTab;
  viewMode: ImageViewMode;
  activeFolderPath: string;
  uploadQueue: UploadQueueItem[];
}

const initialState: ImageState = {
  selectedImageId: null,
  activeTab: 'manager',
  viewMode: 'masonry',
  activeFolderPath: 'Images',
  uploadQueue: [],
};

const imageSlice = createSlice({
  name: 'images',
  initialState,
  reducers: {
    selectImage(state, action: PayloadAction<string | null>) {
      state.selectedImageId = action.payload;
    },
    setActiveTab(state, action: PayloadAction<ImageTab>) {
      state.activeTab = action.payload;
    },
    setViewMode(state, action: PayloadAction<ImageViewMode>) {
      state.viewMode = action.payload;
    },
    setActiveFolderPath(state, action: PayloadAction<string>) {
      state.activeFolderPath = action.payload;
    },
    addToQueue(state, action: PayloadAction<UploadQueueItem>) {
      state.uploadQueue.push(action.payload);
    },
    updateQueueItem(
      state,
      action: PayloadAction<Partial<UploadQueueItem> & { id: string }>,
    ) {
      const idx = state.uploadQueue.findIndex((i) => i.id === action.payload.id);
      if (idx !== -1) {
        state.uploadQueue[idx] = { ...state.uploadQueue[idx], ...action.payload };
      }
    },
    removeFromQueue(state, action: PayloadAction<string>) {
      state.uploadQueue = state.uploadQueue.filter((i) => i.id !== action.payload);
    },
  },
});

export const {
  selectImage,
  setActiveTab,
  setViewMode,
  setActiveFolderPath,
  addToQueue,
  updateQueueItem,
  removeFromQueue,
} = imageSlice.actions;

export default imageSlice.reducer;
