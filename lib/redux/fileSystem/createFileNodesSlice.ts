import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Buckets } from '../rootReducer';
import { 
    FileManagement, 
    FileSystemNode, 
    initialState, 
    NodeContent, 
    NodeItemId, 
    OperationStatus, 
    StorageMetadata 
} from './types';

import { 
    listContents,
    downloadFile, 
    uploadFile, 
    deleteFile, 
    moveFile,
    getPublicFile,
    syncNode
} from './thunks';

export const createFileSystemSlice = (
    bucketName: Buckets,
    customInitialState: FileManagement = initialState
) => {
    const slice = createSlice({
        name: `fileSystem/${bucketName}`,
        initialState: customInitialState,
        reducers: {
            // ... all other reducers remain the same until setOperationStatus

            setOperationStatus(
                state,
                action: PayloadAction<{
                    type: string;
                    status: OperationStatus;
                }>
            ) {
                const { type, status } = action.payload;
                state.isLoading = status.isLoading;
                state.error = status.error || null;
                state.currentOperation = { type, status };

                // Handle operation-specific state updates
                if (status.data) {
                    switch (type) {
                        case 'listContents': {
                            const nodes = status.data as FileSystemNode[];
                            nodes.forEach(node => {
                                state.nodes[node.itemid] = node;
                            });
                            break;
                        }

                        case 'downloadFile': {
                            const { nodeId, blob, metadata } = status.data;
                            if (state.nodes[nodeId]) {
                                state.nodes[nodeId].content = { blob, isDirty: false };
                                state.nodes[nodeId].isContentFetched = true;
                                state.nodes[nodeId].metadata = metadata;
                            }
                            break;
                        }

                        case 'getPublicFile': {
                            const { nodeId, url } = status.data;
                            if (state.nodes[nodeId]) {
                                state.nodes[nodeId].publicUrl = url;
                            }
                            break;
                        }
                        
                        case 'uploadFile': {
                            const node = status.data as FileSystemNode;
                            state.nodes[node.itemid] = node;
                            break;
                        }

                        case 'deleteFile': {
                            const nodeId = status.data as NodeItemId;
                            delete state.nodes[nodeId];
                            state.selectedNodes.delete(nodeId);
                            state.nodesInOperation.delete(nodeId);
                            break;
                        }
                        
                        case 'moveFile': {
                            const node = status.data as FileSystemNode;
                            state.nodes[node.itemid] = node;
                            break;
                        }

                        case 'syncNode': {
                            const node = status.data as FileSystemNode;
                            if (state.nodes[node.itemid]) {
                                state.nodes[node.itemid] = node;
                                state.nodesInOperation.delete(node.itemid);
                            }
                            break;
                        }
                    }
                }
            }
        }
    });

    const thunks = {
        listContents: listContents(bucketName),
        downloadFile: downloadFile(bucketName),
        uploadFile: uploadFile(bucketName),
        deleteFile: deleteFile(bucketName),
        moveFile: moveFile(bucketName),
        getPublicFile: getPublicFile(bucketName),
        syncNode: syncNode
    };
    
    return {
        reducer: slice.reducer,
        actions: {
            ...slice.actions,
            ...thunks
        }
    };
};