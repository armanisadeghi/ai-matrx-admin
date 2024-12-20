// lib/redux/storage/useStorage.ts
import { useDispatch, useSelector } from 'react-redux';
import { StorageItem } from '@/utils/supabase/StorageManager';
import { AppDispatch, RootState } from '@/lib/redux';
import * as storageThunks from './storageThunks';

export const useStorage = () => {
    const dispatch = useDispatch<AppDispatch>();
    const state = useSelector((state: RootState) => state.storage);

    return {
        // State
        ...state,

        // Bucket Management
        listBuckets: () =>
            dispatch(storageThunks.listBuckets()),
        selectBucket: (bucketName: string) =>
            dispatch(storageThunks.selectBucket(bucketName)),

        // Navigation
        navigateFolder: (path: string[]) =>
            dispatch(storageThunks.navigateFolder(path)),
        changeDirectory: (path: string[]) =>
            dispatch(storageThunks.navigateFolder(path)),

        // File & Folder Operations
        createFolder: (path: string[]) =>
            dispatch(storageThunks.createFolder(path)),
        uploadFile: (params: { file: File; targetPath: string[]; customFileName?: string }) =>
            dispatch(storageThunks.uploadFile(params)),
        moveItem: (params: { item: StorageItem; newPath: string[] }) =>
            dispatch(storageThunks.moveItem(params)),
        deleteItem: (item: StorageItem) =>
            dispatch(storageThunks.deleteItem(item)),
        renameItem: (params: { item: StorageItem; newName: string }) =>
            dispatch(storageThunks.renameItem(params)),
        copyItem: (params: { item: StorageItem; destinationPath: string[] }) =>
            dispatch(storageThunks.copyItem(params)),

        // Utility Operations
        getPublicUrl: (item: StorageItem) =>
            dispatch(storageThunks.getPublicUrl(item)),
        downloadItem: (item: StorageItem) =>
            dispatch(storageThunks.downloadItem(item)),
        refreshCurrentFolder: () =>
            dispatch(storageThunks.refreshCurrentFolder()),
    };
};