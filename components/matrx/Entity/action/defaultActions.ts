// components/matrx/Entity/action/defaultActions.ts
import {ButtonSize, ButtonVariant} from "@/components/matrx/Entity/types/tableBuilderTypes";


export const createDefaultTableActions = (
    handleAction: (actionName: string, rowData: any) => void
) => ({
    basic: {
        type: "actions" as const,
        options: {
            actions: [
                {
                    label: "Edit",
                    onClick: (row) => handleAction('edit', row),
                    variant: "outline" as ButtonVariant,
                    size: "xs" as ButtonSize
                },
                {
                    label: "Delete",
                    onClick: (row) => handleAction('delete', row),
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
                    onClick: (row) => handleAction('view', row),
                    variant: "secondary" as ButtonVariant,
                    size: "xs" as ButtonSize
                },
                {
                    label: "Edit",
                    onClick: (row) => handleAction('edit', row),
                    variant: "outline" as ButtonVariant,
                    size: "xs" as ButtonSize
                },
                {
                    label: "Delete",
                    onClick: (row) => handleAction('delete', row),
                    variant: "destructive" as ButtonVariant,
                    size: "xs" as ButtonSize
                }
            ],
            containerClassName: "justify-end"
        }
    }
});


