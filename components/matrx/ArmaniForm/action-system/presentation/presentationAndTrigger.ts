import {PRESENTATION_COMPONENTS} from "@/components/matrx/ArmaniForm/action-system/presentation/presentationRegistry";
import {TRIGGER_COMPONENTS} from "@/components/matrx/ArmaniForm/action-system/triggers";


export const SHEET_AND_ICON = {
    presentation: {
        component: PRESENTATION_COMPONENTS.SHEET,
        propDefinitions: {
            staticProps: {},
            requiredProps: {},
            optionalProps: {
                title: 'Choose an item from the list',
                side: 'right',
                className: 'min-w-[400px]',
                variant: 'primary',
            },
        },
    },
    trigger: {
        component: TRIGGER_COMPONENTS.ICON,
        propDefinitions: {
            staticProps: {},
            requiredProps: {},
            optionalProps: {
                iconName: "listCheck",
                label: 'Choose A Record',
                variant: 'secondary',
                className: 'mr-2',
            },
        },
        props: {},
    },
};
