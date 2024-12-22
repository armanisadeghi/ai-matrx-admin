// hooks/useMenuHandlerRegistration.ts
import { useEffect } from 'react';
// import { useMenuRegistry } from '../menuRegistry';
import { ModuleType } from '../types';

export const useMenuHandlerRegistration = (
    module: ModuleType,
    handlers: Record<string, Function>
) => {
    const registerHandler = useMenuRegistry(state => state.registerHandler);

    useEffect(() => {
        Object.entries(handlers).forEach(([menuId, handler]) => {
            registerHandler(menuId, module, handler);
        });
    }, [module, registerHandler]);
};
