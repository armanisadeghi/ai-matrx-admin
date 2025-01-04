// lib/redux/entity/utils/processFormConfig.ts

import { EntityKeys, EntityAnyFieldKey } from '@/types/entityTypes';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';

interface ProcessedFormConfig<TEntity extends EntityKeys> {
  entitiesToHide: string[];
  enableSearch: boolean;
  excludeFields: Set<EntityAnyFieldKey<TEntity>>;
  defaultShownFields: EntityAnyFieldKey<TEntity>[];
}

export function processFormConfig<TEntity extends EntityKeys>(unifiedLayoutProps: UnifiedLayoutProps): ProcessedFormConfig<TEntity> {
  const formStyleOptions = unifiedLayoutProps.dynamicLayoutOptions?.formStyleOptions || {};
  const entitiesToHide = unifiedLayoutProps.entitiesToHide || [];
  const enableSearch = formStyleOptions.formEnableSearch ?? false;
  const excludeFields = new Set(
    (formStyleOptions.fieldFiltering?.excludeFields || []) as EntityAnyFieldKey<TEntity>[]
  );
  const defaultShownFields = (
    formStyleOptions.fieldFiltering?.defaultShownFields || []
  ) as EntityAnyFieldKey<TEntity>[];

  return {
    entitiesToHide,
    enableSearch,
    excludeFields,
    defaultShownFields,
  };
}