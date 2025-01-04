import { EntityStateField } from '@/lib/redux/entity/types/stateTypes';
import { ComponentDensity } from '@/types/componentConfigTypes';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';

export const filterRelFields = (relationshipFields: EntityStateField[], unifiedLayoutProps: UnifiedLayoutProps) => {
    const fields = relationshipFields || [];
    const entitiesToHideList = unifiedLayoutProps.entitiesToHide || [];
    return {
        filteredRelFields: fields.filter((field) => !entitiesToHideList.includes(field.entityName)),
        hiddenRelFields: fields.filter((field) => entitiesToHideList.includes(field.entityName)),
    };
};

const formStyles = {
    form: {
        compact: '@container w-full py-0.5, px-1',
        normal: '@container w-full py-1, px-2',
        comfortable: '@container w-full py-2, px-3',
    },
    header: {
        compact: 'flex items-center justify-end p-1 gap-1',
        normal: 'flex items-center justify-end p-2 gap-2',
        comfortable: 'flex items-center justify-end p-3 gap-3',
    },
    fieldsWrapper: {
        compact: 'space-y-0',
        normal: 'space-y-1',
        comfortable: 'space-y-2',
    },
    nativeFields: {
        compact: 'grid grid-cols-1 @[600px]:grid-cols-2 @[900px]:grid-cols-3 gap-1',
        normal: 'grid grid-cols-1 @[600px]:grid-cols-2 @[900px]:grid-cols-3 gap-2',
        comfortable: 'grid grid-cols-1 @[600px]:grid-cols-2 @[900px]:grid-cols-3 gap-5',
    },
    relationshipFields: {
        compact: 'space-y-0',
        normal: 'space-y-1',
        comfortable: 'space-y-2',
    },
    nativeFieldsMinimal: {
        compact: 'grid grid-cols-1 gap-1 space-y-2',
        normal: 'grid grid-cols-1 gap-3 space-y-3',
        comfortable: 'grid grid-cols-1 gap-5 space-y-5',
    },
    footer: {
        compact: 'flex items-center justify-end pt-2',
        normal: 'flex items-center justify-end pt-3',
        comfortable: 'flex items-center justify-end pt-4 pb-1',
    },
};

type StyleElement = 'form' | 'header' | 'fieldsWrapper' | 'nativeFields' | 'relationshipFields' | 'nativeFieldsMinimal' | 'footer';

export const getFormStyle = (element: StyleElement, density: ComponentDensity): string => {
    return formStyles[element][density];
};
