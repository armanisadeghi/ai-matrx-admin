// EntityHookProvider.tsx
'use client';

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
import { useValidatedUpdateOrCreate } from '@/lib/redux/entity/hooks/useValidatedUpdateOrCreate';
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
    validatedUpdateOrCreate: typeof useValidatedUpdateOrCreate;
    validation: typeof useEntityValidation;
};

type HookResults = {
    [K in keyof HookMap]: ReturnType<HookMap[K]>
};

const hookInstancesMap = new Map<EntityKeys, Partial<HookResults>>();

function createHookInstance(
    entityName: EntityKeys,
    hookName: keyof HookMap,
    creator: () => any
): any {
    if (!hookInstancesMap.has(entityName)) {
        hookInstancesMap.set(entityName, {});
    }

    const instances = hookInstancesMap.get(entityName)!;

    if (!instances[hookName]) {
        instances[hookName] = creator();
    }

    return instances[hookName];
}

export const hookCreators: Record<keyof HookMap, (entityName: EntityKeys) => any> = {
    entity: (entityName) => createHookInstance(entityName, 'entity', () => useEntity(entityName)),
    entitySelection: (entityName) => createHookInstance(entityName, 'entitySelection', () => useEntitySelection(entityName)),
    activeRecords: (entityName) => createHookInstance(entityName, 'activeRecords', () => useActiveRecords(entityName)),
    entityAnalyzer: (entityName) => createHookInstance(entityName, 'entityAnalyzer', () => useEntityAnalyzer(entityName)),
    entityCrud: (entityName) => createHookInstance(entityName, 'entityCrud', () => useEntityCrud(entityName)),
    entityForm: (entityName) => createHookInstance(entityName, 'entityForm', () => useEntityForm(entityName)),
    entityMetrics: (entityName) => createHookInstance(entityName, 'entityMetrics', () => useEntityMetrics(entityName)),
    entityToasts: (entityName) => createHookInstance(entityName, 'entityToasts', () => useEntityToasts(entityName)),
    fetchRecords: (entityName) => createHookInstance(entityName, 'fetchRecords', () => useFetchRecords(entityName)),
    quickReference: (entityName) => createHookInstance(entityName, 'quickReference', () => useQuickReference(entityName)),
    validatedUpdateOrCreate: (entityName) => createHookInstance(entityName, 'validatedUpdateOrCreate', () => useValidatedUpdateOrCreate(entityName)),
    validation: (entityName) => createHookInstance(entityName, 'validation', () => useEntityValidation(entityName))
};

export function useEntityHooks(
    entityName: EntityKeys,
    hookNames: Array<keyof HookMap>
) {
    return React.useMemo(() => {
        return hookNames.reduce((acc, hookName) => {
            acc[hookName] = hookCreators[hookName](entityName);
            return acc;
        }, {} as Partial<HookResults>);
    }, [entityName, hookNames]);
}

export type { HookMap, HookResults };
