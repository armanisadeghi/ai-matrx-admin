// types/action-types.ts
import { EntityStateField, EntityStateFieldWithValue } from '@/lib/redux/entity/types';
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
    return createFieldAction('fetchSingleRecord', {
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
    return createFieldAction('fetchMultiRecord', {
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
