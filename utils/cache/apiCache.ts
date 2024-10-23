// // Example implementation
// const cachedFetch = async (key: string, fetcher: () => Promise<any>, ttl = 3600) => {
//     const cached = await redis.get(key);
//     if (cached) return JSON.parse(cached);
//
//     const fresh = await fetcher();
//     await redis.setex(key, ttl, JSON.stringify(fresh));
//     return fresh;
// }
