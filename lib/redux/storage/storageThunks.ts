import { createAsyncThunk } from '@reduxjs/toolkit';
import StorageManager, { StorageItem } from '@/utils/supabase/StorageManager';
import { setStorageState } from './storageSlice';
import { RootState } from '@/lib/redux';

// Helper function to handle errors consistently
const handleStorageError = (error: unknown, dispatch: any) => {
    const errorMessage = error instanceof Error ? error.message : 'Storage operation failed';
    dispatch(setStorageState({ error: errorMessage }));
    throw error;
};

export const initializeStorage = createAsyncThunk(
    'storage/initialize',
    async (config: { supabaseUrl: string; supabaseKey: string }, { dispatch }) => {
        try {
            dispatch(setStorageState({ isLoading: true }));
            const storage = StorageManager.getInstance();
            const buckets = await storage.listBuckets();
            dispatch(setStorageState({ buckets, isLoading: false }));
        } catch (error) {
            handleStorageError(error, dispatch);
        }
    }
);

export const selectBucket = createAsyncThunk(
    'storage/selectBucket',
    async (bucketName: string, { dispatch }) => {
        try {
            dispatch(setStorageState({ isLoading: true }));
            const storage = StorageManager.getInstance();
            await storage.selectBucket(bucketName);
            const items = storage.getCurrentItems();
            dispatch(setStorageState({
                currentBucket: bucketName,
                currentPath: [],
                items,
                isLoading: false
            }));
        } catch (error) {
            handleStorageError(error, dispatch);
        }
    }
);

export const navigateFolder = createAsyncThunk(
    'storage/navigateFolder',
    async (path: string[], { dispatch }) => {
        try {
            dispatch(setStorageState({ isLoading: true }));
            const storage = StorageManager.getInstance();
            const items = await storage.navigateToFolder(path);
            dispatch(setStorageState({
                currentPath: path,
                items,
                isLoading: false
            }));
        } catch (error) {
            handleStorageError(error, dispatch);
        }
    }
);

export const createFolder = createAsyncThunk(
    'storage/createFolder',
    async (path: string[], { dispatch, getState }) => {
        try {
            dispatch(setStorageState({ isLoading: true }));
            const storage = StorageManager.getInstance();
            await storage.createFolder(path);
            const state = getState() as RootState;
            const currentItems = await storage.navigateToFolder(state.storage.currentPath);
            dispatch(setStorageState({ items: currentItems, isLoading: false }));
        } catch (error) {
            handleStorageError(error, dispatch);
        }
    }
);

export const uploadFile = createAsyncThunk(
    'storage/uploadFile',
    async ({ file, targetPath, customFileName }: {
        file: File;
        targetPath: string[];
        customFileName?: string;
    }, { dispatch }) => {
        try {
            dispatch(setStorageState({ isLoading: true }));
            const storage = StorageManager.getInstance();
            await storage.uploadFile(file, targetPath, customFileName);
            const items = await storage.navigateToFolder(targetPath);
            dispatch(setStorageState({ items, isLoading: false }));
        } catch (error) {
            handleStorageError(error, dispatch);
        }
    }
);

export const moveItem = createAsyncThunk(
    'storage/moveItem',
    async ({ item, newPath }: { item: StorageItem; newPath: string[] }, { dispatch }) => {
        try {
            dispatch(setStorageState({ isLoading: true }));
            const storage = StorageManager.getInstance();
            await storage.moveItem(item, newPath);
            const currentPath = storage.getCurrentPath();
            const items = await storage.navigateToFolder(currentPath);
            dispatch(setStorageState({ items, isLoading: false }));
        } catch (error) {
            handleStorageError(error, dispatch);
        }
    }
);

export const deleteItem = createAsyncThunk(
    'storage/deleteItem',
    async (item: StorageItem, { dispatch }) => {
        try {
            dispatch(setStorageState({ isLoading: true }));
            const storage = StorageManager.getInstance();
            await storage.deleteItem(item);
            const currentPath = storage.getCurrentPath();
            const items = await storage.navigateToFolder(currentPath);
            dispatch(setStorageState({ items, isLoading: false }));
        } catch (error) {
            handleStorageError(error, dispatch);
        }
    }
);

export const renameItem = createAsyncThunk(
    'storage/renameItem',
    async ({ item, newName }: { item: StorageItem; newName: string }, { dispatch }) => {
        try {
            dispatch(setStorageState({ isLoading: true }));
            const storage = StorageManager.getInstance();
            await storage.renameItem(item, newName);
            const currentPath = storage.getCurrentPath();
            const items = await storage.navigateToFolder(currentPath);
            dispatch(setStorageState({ items, isLoading: false }));
        } catch (error) {
            handleStorageError(error, dispatch);
        }
    }
);

export const copyItem = createAsyncThunk(
    'storage/copyItem',
    async ({ item, destinationPath }: { item: StorageItem; destinationPath: string[] }, { dispatch }) => {
        try {
            dispatch(setStorageState({ isLoading: true }));
            const storage = StorageManager.getInstance();
            await storage.copyItem(item, destinationPath);
            const currentPath = storage.getCurrentPath();
            const items = await storage.navigateToFolder(currentPath);
            dispatch(setStorageState({ items, isLoading: false }));
        } catch (error) {
            handleStorageError(error, dispatch);
        }
    }
);

export const listBuckets = createAsyncThunk(
    'storage/listBuckets',
    async (_, { dispatch }) => {
        try {
            dispatch(setStorageState({ isLoading: true }));
            const storage = StorageManager.getInstance();
            const buckets = await storage.listBuckets();
            dispatch(setStorageState({ buckets, isLoading: false }));
            return buckets;
        } catch (error) {
            handleStorageError(error, dispatch);
        }
    }
);

export const getPublicUrl = createAsyncThunk(
    'storage/getPublicUrl',
    async (item: StorageItem, { dispatch }) => {
        try {
            dispatch(setStorageState({ isLoading: true }));
            const storage = StorageManager.getInstance();
            const url = await storage.getPublicUrl(item);
            dispatch(setStorageState({ isLoading: false }));
            return url;
        } catch (error) {
            handleStorageError(error, dispatch);
        }
    }
);

export const downloadItem = createAsyncThunk(
    'storage/downloadItem',
    async (item: StorageItem, { dispatch }) => {
        try {
            dispatch(setStorageState({ isLoading: true }));
            const storage = StorageManager.getInstance();
            const blob = await storage.downloadItem(item);
            dispatch(setStorageState({ isLoading: false }));
            return blob;
        } catch (error) {
            handleStorageError(error, dispatch);
        }
    }
);

export const refreshCurrentFolder = createAsyncThunk(
    'storage/refreshCurrentFolder',
    async (_, { dispatch }) => {
        try {
            dispatch(setStorageState({ isLoading: true }));
            const storage = StorageManager.getInstance();
            await storage.refreshCurrentFolder();
            const items = storage.getCurrentItems();
            dispatch(setStorageState({ items, isLoading: false }));
        } catch (error) {
            handleStorageError(error, dispatch);
        }
    }
);
