import { UnifiedLayoutProps, UnifiedLayoutHandlers } from "@/components/matrx/Entity/prewired-components/layouts/types";
import {
    DEFAULT_DYNAMIC_STYLE_OPTIONS,
    DEFAULT_FORM_COMPONENT_OPTIONS,
    DEFAULT_FORM_STYLE_OPTIONS,
    DEFAULT_INLINE_ENTITY_OPTIONS,
    DEFAULT_RESIZABLE_LAYOUT_OPTIONS,
    DEFAULT_SELECT_COMPONENT_OPTIONS,
} from "@/app/entities/layout/configs";


export function getLayoutProps(options?: {
    handlers?: UnifiedLayoutHandlers;
}): UnifiedLayoutProps {
    const { handlers = {} } = options || {};
    return {
        layoutState: {
            selectedEntity: "workflow",
            isExpanded: false,
            selectHeight: 0,
            isFullScreen: false,
        },
        handlers: handlers,
        dynamicStyleOptions: {
            ...DEFAULT_DYNAMIC_STYLE_OPTIONS,
            density: "normal",
            animationPreset: "subtle",
        },
        dynamicLayoutOptions: {
            componentOptions: {
                ...DEFAULT_FORM_COMPONENT_OPTIONS,
                quickReferenceType: "cards",
                formLayoutType: "stacked",
                allowEntitySelection: false,
            },
            formStyleOptions: DEFAULT_FORM_STYLE_OPTIONS,
            inlineEntityOptions: DEFAULT_INLINE_ENTITY_OPTIONS,
        },
        resizableLayoutOptions: DEFAULT_RESIZABLE_LAYOUT_OPTIONS,
        selectComponentOptions: DEFAULT_SELECT_COMPONENT_OPTIONS,
        formComponent: "STANDARD",
    };
}
