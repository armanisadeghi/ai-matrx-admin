import {Bucket as SupabaseBucket} from "@supabase/storage-js/dist/module/lib/types";

class StorageMetadata {
    eTag: string;
    size: number;
    mimetype: string;
    cacheControl: string;
    lastModified: string;
    contentLength: number;
    httpStatusCode: number;

    constructor(data: Record<string, any>) {
        this.eTag = data.eTag;
        this.size = data.size;
        this.mimetype = data.mimetype;
        this.cacheControl = data.cacheControl;
        this.lastModified = data.lastModified;
        this.contentLength = data.contentLength;
        this.httpStatusCode = data.httpStatusCode;
    }
}

class StorageItem {
    name: string;
    id: string | null;
    updated_at: string | null;
    created_at: string | null;
    last_accessed_at: string | null;
    metadata: StorageMetadata | null;
    path: string[];
    children: Map<string, StorageItem>;
    isLoaded: boolean;
    loadDepth: number;

    constructor(data: {
        name: string;
        id: string | null;
        updated_at: string | null;
        created_at: string | null;
        last_accessed_at: string | null;
        metadata: Record<string, any> | null;
        path?: string[];
    }) {
        this.name = data.name;
        this.id = data.id;
        this.updated_at = data.updated_at;
        this.created_at = data.created_at;
        this.last_accessed_at = data.last_accessed_at;
        this.metadata = data.metadata ? new StorageMetadata(data.metadata) : null;
        this.path = data.path || [];
        this.children = new Map();
        this.isLoaded = false;
        this.loadDepth = 0;
    }

    get fullPath(): string {
        return [...this.path, this.name].join('/');
    }

    get isFolder(): boolean {
        return this.id === null && this.metadata === null;
    }

    get size(): number {
        return this.metadata?.size || 0;
    }

    get mimeType(): string {
        return this.metadata?.mimetype || '';
    }

    addChild(item: StorageItem): void {
        this.children.set(item.name, item);
    }

    getChild(name: string): StorageItem | undefined {
        return this.children.get(name);
    }

    hasChildren(): boolean {
        return this.children.size > 0;
    }
}


class Bucket {
    id: string;
    name: string;
    owner: string;
    public: boolean;
    file_size_limit: number | null;
    allowed_mime_types: string[] | null;
    created_at: string;
    updated_at: string;
    rootItem: StorageItem;

    constructor(data: SupabaseBucket) {
        this.id = data.id;
        this.name = data.name;
        this.owner = data.owner;
        this.public = data.public;
        this.file_size_limit = data.file_size_limit ?? null;
        this.allowed_mime_types = data.allowed_mime_types ?? null;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        this.rootItem = new StorageItem({
            name: '',
            id: null,
            updated_at: null,
            created_at: null,
            last_accessed_at: null,
            metadata: null,
            path: []
        });
        this.rootItem.isLoaded = true;
    }
}



export {
    Bucket,
    StorageItem,
    StorageMetadata
};