type TimestampInfo = {
    modified: number;
    stateUpdated: number;
    idbUpdated: number;
    cloudUpdated: number;
};

type Availability = {
    inState: boolean;
    inIdb: boolean;
    inCloud: boolean;
};

type Node = {
    id: string;
    sourceId: string;
    path: string;
    name: string;
    type: "file" | "folder";
    parentPath: string;
    size?: number;  // Optional as folders don't have size
    contentHash?: string;  // Optional as folders don't have content hash
    timestamps: TimestampInfo;
    availability: Availability;
    folderStatus?: "unknown" | "empty" | "hasChildren";
    childrenCount?: number;
};

type Nodes = {
    byId: Record<string, Node>;
    allIds: string[];
};

type FetchStatus = {
    status: "not_fetched" | "fetching" | "fetched" | "error";
    lastFetched: number;
    childrenFetched?: boolean;
    contentFetched?: boolean;
    error: string | null;
};

type ContentLocation = {
    idbKey: string | null;
    cloudPath: string | null;
    tempPath: string | null;
};

type Content = {
    data: string;
    contentType: string;
    hash: string;
    size: number;
    source: "state" | "idb" | "cloud";
    fetchedAt: number;
    modified: boolean;
    cached: boolean;
    locations: ContentLocation;
};

type Contents = Record<string, Content>;

type Source = {
    id: string;
    type: string;
    name: string;
    status: "ready" | "error";
    lastSync: number;
    bucket: string;
    rootPath: string;
};

type Sources = {
    byId: Record<string, Source>;
    allIds: string[];
};

type SyncStatus = {
    state: "pending" | "completed" | "failed";
    idb: "pending" | "completed" | "failed";
    cloud: "pending" | "completed" | "failed";
};

type Operation = {
    id: string;
    type: "move" | "copy" | "delete";
    sourceId: string;
    status: "pending" | "completed" | "failed";
    timestamp: number;
    sourcePath: string;
    targetPath?: string;
    retryCount: number;
    syncStatus: SyncStatus;
};

type Operations = {
    byId: Record<string, Operation>;
    allIds: string[];
    queue: string[];
};

type SyncOperation = {
    id: string;
    type: "state_to_cloud" | "cloud_to_state";
    status: "pending" | "in_progress" | "completed" | "failed";
    paths: string[];
    timestamp: number;
};

type Sync = {
    lastGlobalSync: number;
    inProgress: boolean;
    errors: string[];
    operations: Record<string, SyncOperation>;
};

type UIState = {
    selectedNodes: string[];
    expandedFolders: string[];
    activeNode: string | null;
    view: "list" | "grid";
};

type State = {
    nodes: Nodes;
    fetchStatus: Record<string, FetchStatus>;
    contents: Contents;
    sources: Sources;
    operations: Operations;
    sync: Sync;
    ui: UIState;
};
