import { ComponentDensity } from "@/types/componentConfigTypes";


export const filterRelFields = (relationshipFields, entitiesToHide) => {
    const fields = relationshipFields || [];
    const entitiesToHideList = entitiesToHide || [];
    return {
        filteredRelFields: fields.filter(field =>
            !entitiesToHideList.includes(field.entityName)
        ),
        hiddenRelFields: fields.filter(field =>
            entitiesToHideList.includes(field.entityName)
        )
    };
};



const formStyles = {
    form: {
        compact: 'w-full p-0.5',
        normal: 'w-full p-1',
        comfortable: 'w-full p-2'
    },
    header: {
        compact: 'flex items-center justify-end p-1 gap-1',
        normal: 'flex items-center justify-end p-2 gap-2',
        comfortable: 'flex items-center justify-end p-3 gap-3'
    },
    fieldsWrapper: {
        compact: 'space-y-0',
        normal: 'space-y-1',
        comfortable: 'space-y-2'
    },
    nativeFields: {
        compact: 'grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-0',
        normal: 'grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-1',
        comfortable: 'grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2'
    },
    relationshipFields: {
        compact: 'space-y-0',
        normal: 'space-y-1',
        comfortable: 'space-y-2'
    }
};

type StyleElement = 'form' | 'header' | 'fieldsWrapper' | 'nativeFields' | 'relationshipFields';

export const getFormStyle = (element: StyleElement, density: ComponentDensity): string => {
    return formStyles[element][density];
};
