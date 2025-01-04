import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { EntityKeys, MatrxRecordId } from '@/types';
import EntityFormAnyRecord from '../forms/EntityFormAnyRecordWithRelated';
import EntitySheet from '../fields/other-components/EntitySheet';

interface EntityRecordSheetProps {
    selectedEntity: EntityKeys;
    recordId: MatrxRecordId;
    unifiedLayoutProps: UnifiedLayoutProps;
    updateKey: number;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    position?: "left" | "right" | "top" | "bottom" | "center";
    size?: "sm" | "md" | "default" | "lg" | "xl" | "full";
    title?: React.ReactNode;
    description?: React.ReactNode;
    footer?: React.ReactNode;
    showClose?: boolean;
    trigger?: React.ReactNode;
    className?: string;
}

export const EntityRecordSheet: React.FC<EntityRecordSheetProps> = ({
    selectedEntity,
    recordId,
    unifiedLayoutProps,
    updateKey,
    open,
    onOpenChange,
    position,
    size,
    title,
    description,
    footer,
    showClose,
    trigger,
    className,
}) => {
    if (!selectedEntity || !recordId) {
        return null;
    }

    return (
        <EntitySheet
            open={open}
            onOpenChange={onOpenChange}
            position={position}
            size={size}
            title={title}
            description={description}
            footer={footer}
            showClose={showClose}
            trigger={trigger}
            className={className}
        >
            <EntityFormAnyRecord
                key={`form-${selectedEntity}-${updateKey}`}
                recordId={recordId}
                unifiedLayoutProps={unifiedLayoutProps}
            />
        </EntitySheet>
    );
};

export default EntityRecordSheet;