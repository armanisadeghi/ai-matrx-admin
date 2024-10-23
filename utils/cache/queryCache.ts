// interface QueryCache {
//     key: string;
//     result: any;
//     timestamp: number;
//     dependencies: string[];
// }
//
// class QueryCacheManager {
//     private cache: Map<string, QueryCache> = new Map();
//     private TTL = 1000 * 60 * 5; // 5 minutes
//
//     async getQueryResult(query: string, dependencies: string[] = []) {
//         const key = this.generateKey(query);
//         const cached = this.cache.get(key);
//
//         if (cached && !this.isExpired(cached)) {
//             return cached.result;
//         }
//
//         const result = await executeQuery(query);
//         this.cache.set(key, {
//             key,
//             result,
//             timestamp: Date.now(),
//             dependencies
//         });
//
//         return result;
//     }
//
//     invalidateByDependency(dependency: string) {
//         for (const [key, cache] of this.cache.entries()) {
//             if (cache.dependencies.includes(dependency)) {
//                 this.cache.delete(key);
//             }
//         }
//     }
//
//     private isExpired(cache: QueryCache): boolean {
//         return Date.now() - cache.timestamp > this.TTL;
//     }
//
//     private generateKey(query: string): string {
//         return crypto.createHash('md5').update(query).digest('hex');
//     }
// }
