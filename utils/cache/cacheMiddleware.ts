// import { Middleware, MiddlewareAPI, Dispatch, AnyAction } from 'redux';
// import { createSelector } from 'reselect';
//
// // Cache configuration types
// interface CacheConfig {
//     ttl: number;
//     key: string;
//     invalidateOn: string[];
//     storage: 'memory' | 'local' | 'session';
// }
//
// interface CacheEntry {
//     data: any;
//     timestamp: number;
//     key: string;
// }
//
// // Cache middleware configuration
// const defaultConfig: CacheConfig = {
//     ttl: 5 * 60 * 1000, // 5 minutes
//     key: '',
//     invalidateOn: [],
//     storage: 'memory'
// };
//
// // Cache storage implementations
// const storageHandlers = {
//     memory: new Map<string, CacheEntry>(),
//     local: {
//         get: (key: string) => JSON.parse(localStorage.getItem(key) || 'null'),
//         set: (key: string, value: CacheEntry) => localStorage.setItem(key, JSON.stringify(value)),
//         delete: (key: string) => localStorage.removeItem(key)
//     },
//     session: {
//         get: (key: string) => JSON.parse(sessionStorage.getItem(key) || 'null'),
//         set: (key: string, value: CacheEntry) => sessionStorage.setItem(key, JSON.stringify(value)),
//         delete: (key: string) => sessionStorage.removeItem(key)
//     }
// };
//
// // Action types
// export const CACHE_ACTION = 'CACHE_ACTION';
// export const INVALIDATE_CACHE = 'INVALIDATE_CACHE';
//
// // Cache middleware
// export const createCacheMiddleware = (config: Partial<CacheConfig> = {}): Middleware => {
//     const finalConfig = { ...defaultConfig, ...config };
//
//     return (store: MiddlewareAPI) => (next: Dispatch) => (action: AnyAction) => {
//         // Handle cache invalidation
//         if (action.type === INVALIDATE_CACHE) {
//             const { key } = action.payload;
//             const storage = storageHandlers[finalConfig.storage];
//             if (storage instanceof Map) {
//                 storage.delete(key);
//             } else {
//                 storage.delete(key);
//             }
//             return next(action);
//         }
//
//         // Check if action should be cached
//         if (!action.meta?.cache) {
//             return next(action);
//         }
//
//         const cacheKey = `${finalConfig.key}_${action.type}`;
//         const storage = storageHandlers[finalConfig.storage];
//
//         // Check cache
//         let cachedData;
//         if (storage instanceof Map) {
//             cachedData = storage.get(cacheKey);
//         } else {
//             cachedData = storage.get(cacheKey);
//         }
//
//         if (cachedData && Date.now() - cachedData.timestamp < finalConfig.ttl) {
//             return cachedData.data;
//         }
//
//         // Execute action and cache result
//         const result = next(action);
//         const cacheEntry: CacheEntry = {
//             data: result,
//             timestamp: Date.now(),
//             key: cacheKey
//         };
//
//         if (storage instanceof Map) {
//             storage.set(cacheKey, cacheEntry);
//         } else {
//             storage.set(cacheKey, cacheEntry);
//         }
//
//         return result;
//     };
// };
//
// // Saga integration
// export function* cachingSaga(action: AnyAction, saga: any) {
//     const cacheKey = `saga_${action.type}`;
//     const storage = storageHandlers.memory;
//
//     const cachedData = storage.get(cacheKey);
//     if (cachedData && Date.now() - cachedData.timestamp < defaultConfig.ttl) {
//         return cachedData.data;
//     }
//
//     const result = yield* saga(action);
//     storage.set(cacheKey, {
//         data: result,
//         timestamp: Date.now(),
//         key: cacheKey
//     });
//
//     return result;
// }
