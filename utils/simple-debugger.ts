export const DEBUG = true;

export const DEBUG_ENTITIES = {
    messageTemplate: true,
    aiSettings: false,
}

export const DEBUG_HOOKS = {
    useRelFetchProcessing: true,
    useRelationshipDirectCreate: false,
    useRelationshipsWithProcessing: false,
}

export const debugFor = (entity, hook?) => {
    if (!DEBUG) return () => {};
    if (!DEBUG_ENTITIES[entity]) return () => {};
    if (hook && DEBUG_HOOKS.hasOwnProperty(hook) && !DEBUG_HOOKS[hook]) return () => {};
    
    return (message: string, data?: any, open?: boolean, log?: boolean) => {
        if (!log) return
        const prefix = hook ? `[${entity}: ${hook}]` : `[${entity}]`;
        
        if (data) {
            const shouldStringify = 
                (Array.isArray(data) && data.length > 0) || 
                (typeof data === 'object' && data !== null && Object.keys(data).length > 0);
                
            if (open && shouldStringify) {
                console.log(`${prefix} ${message}`);
                console.log(JSON.stringify(data, null, 2));
            } else {
                console.log(`${prefix} ${message}`, data);
            }
        } else {
            console.log(`${prefix} ${message}`);
        }
    };
};

export const RENDER_COUNTS = new Map();

export const useRenderCount = (hookName: string) => {
    const firstRender = !RENDER_COUNTS.has(hookName);
    const count = (RENDER_COUNTS.get(hookName) || 0) + 1;
    RENDER_COUNTS.set(hookName, count);

    const log = debugFor('renders', hookName);
    if (firstRender) {
        log(`First mount`);
    } else {
        log(`Re-render #${count}`);
    }

    return count;
};
