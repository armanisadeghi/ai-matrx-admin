import EntityFormCustomMinimal from '@/app/entities/forms/EntityFormCustomMinimal';
import { getUnifiedLayoutProps, getUpdatedUnifiedLayoutProps } from '@/app/entities/layout/configs';
import { useAppSelector, useEntityTools } from '@/lib/redux';

const initialLayoutProps = getUnifiedLayoutProps({
    entityKey: 'aiSettings',
    formComponent: 'MINIMAL',
    quickReferenceType: 'LIST',
    isExpanded: true,
    handlers: {},
});

const layoutProps = getUpdatedUnifiedLayoutProps(initialLayoutProps, {
    formComponent: 'MINIMAL',
    dynamicStyleOptions: {
        density: 'compact',
        size: 'sm',
    },
    dynamicLayoutOptions: {
        formStyleOptions: {
            fieldFiltering: {
                excludeFields: ['id'],
                defaultShownFields: [ 'presetName','aiEndpoint', 'aiProvider', 'aiModel', 'temperature', 'maxTokens', 'stream', 'responseFormat', 'tools',],
            },
        },
    },
});

export const DynamicPromptSettings = () => {
    const { selectors } = useEntityTools('aiSettings');
    const activeRecordid = useAppSelector(selectors.selectActiveRecordId);

    return (
        <EntityFormCustomMinimal
            recordId={activeRecordid}
            unifiedLayoutProps={layoutProps}
        />
    );
};

export default DynamicPromptSettings;