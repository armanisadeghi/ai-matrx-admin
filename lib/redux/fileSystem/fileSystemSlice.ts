// fileSystemSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Initial State
const initialState: State = {
    fsNodes: {
        byId: {},
        allIds: []
    },
    fetchStatus: {},
    contents: {},
    sources: {
        byId: {},
        allIds: []
    },
    operations: {
        byId: {},
        allIds: [],
        queue: []
    },
    sync: {
        lastGlobalSync: 0,
        inProgress: false,
        errors: [],
        operations: {}
    },
    ui: {
        selectedNodes: [],
        expandedFolders: [],
        activeNode: null,
        view: 'list'
    }
};

const fileSystemSlice = createSlice({
    name: 'fileSystem',
    initialState,
    reducers: {
        // Node operations
        addNode(state, action: PayloadAction<FsNode>) {
            const fsNodes = action.payload;
            state.fsNodes.byId[fsNodes.id] = fsNodes;
            state.fsNodes.allIds.push(fsNodes.id);
        },
        updateNode(state, action: PayloadAction<{ id: string; updates: Partial<Node> }>) {
            const { id, updates } = action.payload;
            if (state.nodes.byId[id]) {
                state.nodes.byId[id] = { ...state.nodes.byId[id], ...updates };
            }
        },
        removeNode(state, action: PayloadAction<string>) {
            const id = action.payload;
            delete state.nodes.byId[id];
            state.nodes.allIds = state.nodes.allIds.filter(nodeId => nodeId !== id);
        },

        // Content operations
        setContent(state, action: PayloadAction<{ nodeId: string; content: Content }>) {
            const { nodeId, content } = action.payload;
            state.contents[nodeId] = content;
        },
        updateContent(state, action: PayloadAction<{ nodeId: string; updates: Partial<Content> }>) {
            const { nodeId, updates } = action.payload;
            if (state.contents[nodeId]) {
                state.contents[nodeId] = { ...state.contents[nodeId], ...updates };
            }
        },

        // Fetch status operations
        setFetchStatus(state, action: PayloadAction<{ nodeId: string; status: FetchStatus }>) {
            state.fetchStatus[action.payload.nodeId] = action.payload.status;
        },

        // Source operations
        addSource(state, action: PayloadAction<Source>) {
            const source = action.payload;
            state.sources.byId[source.id] = source;
            state.sources.allIds.push(source.id);
        },

        // Operation queue management
        addOperation(state, action: PayloadAction<Operation>) {
            const operation = action.payload;
            state.operations.byId[operation.id] = operation;
            state.operations.allIds.push(operation.id);
            state.operations.queue.push(operation.id);
        },
        updateOperation(state, action: PayloadAction<{ id: string; updates: Partial<Operation> }>) {
            const { id, updates } = action.payload;
            if (state.operations.byId[id]) {
                state.operations.byId[id] = { ...state.operations.byId[id], ...updates };
            }
        },

        // Sync state management
        setSyncStatus(state, action: PayloadAction<Partial<Sync>>) {
            state.sync = { ...state.sync, ...action.payload };
        },
        addSyncOperation(state, action: PayloadAction<{ id: string; operation: SyncOperation }>) {
            state.sync.operations[action.payload.id] = action.payload.operation;
        },

        // UI state management
        setUIState(state, action: PayloadAction<Partial<UIState>>) {
            state.ui = { ...state.ui, ...action.payload };
        }
    }
});

// Export actions
export const {
    addNode,
    updateNode,
    removeNode,
    setContent,
    updateContent,
    setFetchStatus,
    addSource,
    addOperation,
    updateOperation,
    setSyncStatus,
    addSyncOperation,
    setUIState
} = fileSystemSlice.actions;

// Export reducer
export default fileSystemSlice.reducer;