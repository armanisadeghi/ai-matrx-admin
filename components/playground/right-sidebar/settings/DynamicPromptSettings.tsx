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

// Displays the active Record ID for settings
// If we added different settings to Selection, then we could have each tab # display a different setting and the active tab would become the activve record ID
// Running 1 test would run the active settings record Id with the recipe
// Running multiple at once would trigger a separate run for each one in selections.



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