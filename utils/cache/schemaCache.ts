class SchemaCache {
    private static instance: SchemaCache;
    private cache: Map<string, any> = new Map();
    private lastUpdated: Map<string, number> = new Map();
    private TTL = 1000 * 60 * 60; // 1 hour

    static getInstance() {
        if (!SchemaCache.instance) {
            SchemaCache.instance = new SchemaCache();
        }
        return SchemaCache.instance;
    }

    async get(key: string) {
        if (this.isExpired(key)) {
            this.cache.delete(key);
            return null;
        }
        return this.cache.get(key);
    }

    set(key: string, value: any) {
        this.cache.set(key, value);
        this.lastUpdated.set(key, Date.now());
    }

    private isExpired(key: string): boolean {
        const updated = this.lastUpdated.get(key);
        if (!updated) return true;
        return Date.now() - updated > this.TTL;
    }
}
