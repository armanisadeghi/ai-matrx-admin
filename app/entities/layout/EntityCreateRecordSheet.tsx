import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { EntityKeys } from '@/types';
import EntitySheet from '../fields/other-components/EntitySheet';
import { createEntitySelectors, useAppStore } from '@/lib/redux';
import EntityFormCreateRecordWithRelated from '../forms/EntityFormCreateRecordWithRelated';
import { getSimplifiedLayoutProps } from './configs';

const getLayoutOptions = (entityName: EntityKeys): UnifiedLayoutProps => {
    const layoutProps = getSimplifiedLayoutProps({
        entityKey: entityName,
        formComponent: 'MINIMAL',
        quickReferenceType: 'LIST',
        isExpanded: true,
        handlers: {},
        excludeFields: ['id'],
        defaultShownFields: [],
        density: 'compact',
        size: 'sm',
    });
    return layoutProps;
};

interface EntityCreateRecordSheetProps {
    selectedEntity: EntityKeys;
    unifiedLayoutProps: UnifiedLayoutProps;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    position?: 'left' | 'right' | 'top' | 'bottom' | 'center';
    size?: 'sm' | 'md' | 'default' | 'lg' | 'xl' | 'full';
    title?: React.ReactNode;
    description?: React.ReactNode;
    footer?: React.ReactNode;
    showClose?: boolean;
    trigger?: React.ReactNode;
    className?: string;
    postCreationOptions?: boolean;
    children?: React.ReactNode;
    showRelatedFields?: boolean;
    showFieldSelectionControls?: boolean;
    onCreateSuccess?: () => void;
    onCreateError?: (error: Error) => void;
}

export const EntityCreateRecordSheet: React.FC<EntityCreateRecordSheetProps> = ({
    selectedEntity,
    unifiedLayoutProps = getLayoutOptions(selectedEntity),
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
    postCreationOptions = false,
    children,
    showRelatedFields = true,
    showFieldSelectionControls = false,
    onCreateSuccess,
    onCreateError,
}) => {
    if (!selectedEntity) {
        return null;
    }
    const Store = useAppStore();
    const selectors = createEntitySelectors(selectedEntity);
    const entityDisplayName = selectors.selectEntityDisplayName(Store.getState());

    description = description || `Edit ${entityDisplayName}`;

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
            <EntityFormCreateRecordWithRelated
                key={`form-${selectedEntity}`}
                unifiedLayoutProps={unifiedLayoutProps}
                postCreationOptions={postCreationOptions}
                showRelatedFields={showRelatedFields}
                showFieldSelectionControls={showFieldSelectionControls}
                onCreateSuccess={onCreateSuccess}
                onCreateError={onCreateError}
            >
                {children}
            </EntityFormCreateRecordWithRelated>
        </EntitySheet>
    );
};

export default EntityCreateRecordSheet;
