// hooks/useContextMenu.ts
import { useCallback } from 'react';
import { menuItems } from '../menuConfig';
import { ModuleType, MenuItemConfig } from '../types';

interface UseContextMenuProps {
    module: ModuleType;
    show?: string[];
    hide?: string[];
    data?: any;
}

export const useContextMenu = ({ module, show = [], hide = [], data }: UseContextMenuProps) => {
    const getVisibleItems = useCallback(() => {
        const visibleItems = new Set<string>();

        // Add default visible items
        Object.values(menuItems).forEach(item => {
            if (item.defaultVisible &&
                !hide.includes(item.id) &&
                (!item.modules || item.modules.includes(module))) {
                visibleItems.add(item.id);
            }
        });

        // Add explicitly shown items
        show.forEach(id => {
            if (menuItems[id] && !hide.includes(id)) {
                visibleItems.add(id);
            }
        });

        return Array.from(visibleItems);
    }, [module, show, hide]);

    const buildMenuStructure = useCallback(() => {
        const visibleIds = getVisibleItems();

        return visibleIds.map(id => {
            const item = menuItems[id];
            return {
                ...item,
                onClick: item.handler ? () => item.handler?.(module, data) : undefined,
                subItems: item.subItems?.map(subId => ({
                    ...menuItems[subId],
                    onClick: menuItems[subId].handler ?
                        () => menuItems[subId].handler?.(module, data) :
                        undefined
                }))
            };
        });
    }, [module, data, getVisibleItems]);

    return {
        menuItems: buildMenuStructure()
    };
};
