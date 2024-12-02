// components/matrx/Entity/action/defaultActions.ts
import {ButtonSize, ButtonVariant} from "@/components/matrx/Entity/types/tableBuilderTypes";
import {EntityKeys} from "@/types/entityTypes";
import {Row} from "@tanstack/react-table";
import {EntityDataWithId} from "@/lib/redux/entity/types/stateTypes";


export const createDefaultTableActions = <TEntity extends EntityKeys>(
    handleAction: (actionName: string, row: Row<EntityDataWithId<TEntity>>) => void
) => ({
    basic: {
        type: "actions" as const,
        options: {
            actions: [
                {
                    label: "Edit",
                    onClick: (row: Row<EntityDataWithId<TEntity>>) => handleAction('edit', row),
                    variant: "outline" as ButtonVariant,
                    size: "xs" as ButtonSize
                },
                {
                    label: "Delete",
                    onClick: (row: Row<EntityDataWithId<TEntity>>) => handleAction('delete', row),
                    variant: "destructive" as ButtonVariant,
                    size: "xs" as ButtonSize
                }
            ],
            containerClassName: "justify-end"
        }
    },
    expanded: {
        type: "actions" as const,
        options: {
            actions: [
                {
                    label: "View",
                    onClick: (row: Row<EntityDataWithId<TEntity>>) => handleAction('view', row),
                    variant: "secondary" as ButtonVariant,
                    size: "xs" as ButtonSize
                },
                {
                    label: "Edit",
                    onClick: (row: Row<EntityDataWithId<TEntity>>) => handleAction('edit', row),
                    variant: "outline" as ButtonVariant,
                    size: "xs" as ButtonSize
                },
                {
                    label: "Delete",
                    onClick: (row: Row<EntityDataWithId<TEntity>>) => handleAction('delete', row),
                    variant: "destructive" as ButtonVariant,
                    size: "xs" as ButtonSize
                }
            ],
            containerClassName: "justify-end"
        }
    }
});


