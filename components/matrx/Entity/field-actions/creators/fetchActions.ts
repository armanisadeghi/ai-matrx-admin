// types/action-types.ts
import { EntityStateField, EntityStateFieldWithValue } from '@/lib/redux/entity/types/stateTypes';
import { Eye, List } from 'lucide-react';
import {
    ActionConfig,
    ActionType,
    PresentationType,
    RecordDisplayConfig
} from "../types";
import {createFieldAction} from "../creators/createFieldAction";
import {SingleRecordViewer} from "../components/SingleRecordViewer";
import {MultiRecordViewer} from "../layouts/MultiRecordViewer";

export const createSingleRecordAction = (
    config: RecordDisplayConfig
): ActionConfig => {
    // @ts-ignore - COMPLEX: 'fetchSingleRecord' is not a valid ActionType, needs to be added to ActionType enum
    return createFieldAction('fetchSingleRecord' as any, {
        type: ActionType.CUSTOM,
        icon: Eye,
        label: 'View Record',
        presentation: config.presentation,
        buttonStyle: 'full',
        component: SingleRecordViewer,
        props: {
            displayConfig: config,
        },
        containerProps: {
            title: config.title || 'View Record',
            className: 'min-w-[600px]',
        },
    });
};

export const createMultiRecordAction = (
    config: RecordDisplayConfig
): ActionConfig => {
    // @ts-ignore - COMPLEX: 'fetchMultiRecord' is not a valid ActionType, needs to be added to ActionType enum
    return createFieldAction('fetchMultiRecord' as any, {
        type: ActionType.CUSTOM,
        icon: List,
        label: 'View Records',
        presentation: config.presentation,
        buttonStyle: 'full',
        component: MultiRecordViewer,
        props: {
            displayConfig: config,
        },
        containerProps: {
            title: config.title || 'View Records',
            className: 'min-w-[800px]',
        },
    });
};
