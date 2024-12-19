// providers/entity-context/EntityHookProvider.tsx

import React from 'react';
import { EntityKeys } from '@/types/entityTypes';

import { useActiveRecords } from '@/lib/redux/entity/hooks/useActiveRecords';
import { useEntity } from '@/lib/redux/entity/hooks/useEntity';
import { useEntityAnalyzer } from '@/lib/redux/entity/hooks/useEntityAnalyzer';
import { useEntityCrud } from '@/lib/redux/entity/hooks/useEntityCrud';
import { useEntityForm } from '@/lib/redux/entity/hooks/useEntityForm';
import { useEntityMetrics } from '@/lib/redux/entity/hooks/useEntityMetrics';
import { useEntitySelection } from '@/lib/redux/entity/hooks/useEntitySelection';
import { useEntityToasts } from '@/lib/redux/entity/hooks/useEntityToasts';
import { useFetchRecords } from '@/lib/redux/entity/hooks/useFetchRecords';
import { useQuickReference } from '@/lib/redux/entity/hooks/useQuickReference';
import { useEntityValidation } from "@/lib/redux/entity/hooks/useEntityValidation";

type HookMap = {
    activeRecords: typeof useActiveRecords;
    entity: typeof useEntity;
    entityAnalyzer: typeof useEntityAnalyzer;
    entityCrud: typeof useEntityCrud;
    entityForm: typeof useEntityForm;
    entityMetrics: typeof useEntityMetrics;
    entitySelection: typeof useEntitySelection;
    entityToasts: typeof useEntityToasts;
    fetchRecords: typeof useFetchRecords;
    quickReference: typeof useQuickReference;
    validation: typeof useEntityValidation;
};

type HookName = keyof HookMap;
type HookResults = { [K in HookName]: ReturnType<HookMap[K]> };

const hookInstancesMap = new Map<EntityKeys, Partial<HookResults>>();

function createHookInstance(
    entityName: EntityKeys | undefined,
    hookName: HookName,
    creator: () => any
): any {
    if (!entityName) {
        return null;
    }

    if (!hookInstancesMap.has(entityName)) {
        hookInstancesMap.set(entityName, {});
    }

    const instances = hookInstancesMap.get(entityName)!;

    if (!instances[hookName]) {
        instances[hookName] = creator();
    }

    return instances[hookName];
}

const createNullHookResults = (hookNames: HookName[]) => {
    return hookNames.reduce((acc, hookName) => {
        acc[hookName] = null;
        return acc;
    }, {} as Partial<HookResults>);
};

export const hookCreators: Record<HookName, (entityName: EntityKeys | undefined) => any> = {
    entity: (entityName) => createHookInstance(entityName, 'entity', () => entityName ? useEntity(entityName) : null),
    entitySelection: (entityName) => createHookInstance(entityName, 'entitySelection', () => entityName ? useEntitySelection(entityName) : null),
    activeRecords: (entityName) => createHookInstance(entityName, 'activeRecords', () => entityName ? useActiveRecords(entityName) : null),
    entityAnalyzer: (entityName) => createHookInstance(entityName, 'entityAnalyzer', () => entityName ? useEntityAnalyzer(entityName) : null),
    entityCrud: (entityName) => createHookInstance(entityName, 'entityCrud', () => entityName ? useEntityCrud(entityName) : null),
    entityForm: (entityName) => createHookInstance(entityName, 'entityForm', () => entityName ? useEntityForm(entityName) : null),
    entityMetrics: (entityName) => createHookInstance(entityName, 'entityMetrics', () => entityName ? useEntityMetrics(entityName) : null),
    entityToasts: (entityName) => createHookInstance(entityName, 'entityToasts', () => entityName ? useEntityToasts(entityName) : null),
    fetchRecords: (entityName) => createHookInstance(entityName, 'fetchRecords', () => entityName ? useFetchRecords(entityName) : null),
    quickReference: (entityName) => createHookInstance(entityName, 'quickReference', () => entityName ? useQuickReference(entityName) : null),
    validation: (entityName) => createHookInstance(entityName, 'validation', () => entityName ? useEntityValidation(entityName) : null)
};

export function useEntityHooks(
    entityName: EntityKeys | undefined,
    hookNames: HookName[]
) {
    return React.useMemo(() => {
        if (!entityName) {
            return createNullHookResults(hookNames);
        }

        return hookNames.reduce((acc, hookName) => {
            acc[hookName] = hookCreators[hookName](entityName);
            return acc;
        }, {} as Partial<HookResults>);
    }, [entityName, hookNames]);
}

export type { HookMap, HookResults, HookName };