// components/matrx/Entity/types/entityTable.ts

import {EntityData, EntityKeys} from "@/types/entityTypes";

export interface DataTableProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
    variant?: 'default' | 'compact' | 'cards' | 'minimal';
    options?: {
        showCheckboxes?: boolean;
        showFilters?: boolean;
        showActions?: boolean;
        actions?: {
            showEdit?: boolean;
            showDelete?: boolean;
            showExpand?: boolean;
            custom?: Array<{
                label: string;
                onClick: (row: EntityData<TEntity>) => void;
                variant?: "outline" | "destructive";
                size?: "xs" | "sm";
            }>;
        };
    };
}

export const DEFAULT_OPTIONS = {
    showCheckboxes: true,
    showFilters: true,
    showActions: true,
    actions: {
        showEdit: true,
        showDelete: true,
        showExpand: true,
    }
};

