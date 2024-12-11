import {DetailLevel, LogLevel} from '@/lib/logger/types';
import {atom, selector} from 'recoil';

export const ADMIN_DEBUG_DEFAULTS = {
    logging: {
        logLevel: 'none' as LogLevel,
        detailLevel: 'standard' as DetailLevel,
    },
    monitoring: {
        measurementMonitor: false,
        entityStateTracker: false,
    }
} as const;

export const logLevelState = atom<LogLevel>({
    key: 'adminLogLevel',
    default: ADMIN_DEBUG_DEFAULTS.logging.logLevel,
});

export const detailLevelState = atom<DetailLevel>({
    key: 'adminDetailLevel',
    default: ADMIN_DEBUG_DEFAULTS.logging.detailLevel,
});

// Monitoring related atoms
export const showMeasurementMonitor = atom<boolean>({
    key: 'adminMeasurementMonitor',
    default: ADMIN_DEBUG_DEFAULTS.monitoring.measurementMonitor,
});

export const showEntityStateTracker = atom<boolean>({
    key: 'adminEntityStateTracker',
    default: ADMIN_DEBUG_DEFAULTS.monitoring.entityStateTracker,
});

export const shouldAllowDebugSelector = selector<boolean>({
    key: 'shouldAllowDebug',
    get: () => {
        if (typeof window === 'undefined') return false;
        return process.env.NEXT_PUBLIC_ENV === 'development' ||
            process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true';
    }
});

const getDefaultFromStorage = (key: string, defaultValue: any) => {
    if (typeof window === 'undefined') return defaultValue;
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : defaultValue;
    } catch {
        return defaultValue;
    }
};

// Legacy debug interface state
export const legacyDebugInterfaceState = atom<boolean>({
    key: 'legacyDebugInterfaceEnabled',
    default: false,
    effects: [
        ({setSelf, onSet}) => {
            if (typeof window === 'undefined') return;

            setSelf(getDefaultFromStorage('debug-interface-enabled', false));

            onSet((newValue) => {
                localStorage.setItem('debug-interface-enabled', JSON.stringify(newValue));
            });
        },
    ],
});


export const isAnyDebugActiveSelector = selector<boolean>({
    key: 'isAnyDebugActive',
    get: ({get}) => {
        const legacyDebug = get(legacyDebugInterfaceState);
        const logLevel = get(logLevelState);
        const measurementMonitor = get(showMeasurementMonitor);
        const entityStateTracker = get(showEntityStateTracker);

        return legacyDebug ||
            logLevel === 'debug' ||
            measurementMonitor ||
            entityStateTracker;
    }
});
