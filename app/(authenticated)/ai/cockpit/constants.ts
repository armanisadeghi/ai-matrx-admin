import { getSimplifiedLayoutProps } from "@/app/entities/layout/configs";
import { UnifiedLayoutProps } from "@/components/matrx/Entity";


export const temptDefaults = {
  currentMode: "default",
  version: 1,
};

export const getLayoutOptions = (): UnifiedLayoutProps => {
    const layoutProps = getSimplifiedLayoutProps({
        entityKey: 'recipe',
        formComponent: 'MINIMAL',
        quickReferenceType: 'LIST',
        isExpanded: true,
        handlers: {},
        excludeFields: ['id'],
        defaultShownFields: ['name', 'status', 'isPublic', 'description', 'tags',  'version'],
        density: 'compact',
        size: 'sm',
    });
    return layoutProps;
};
