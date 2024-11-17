// creators/createFieldAction.ts
import { ActionType, PresentationType, ActionConfig, FieldConfig } from '../types';


export const createFieldAction = (
    type: ActionType,
    config: Partial<ActionConfig>
): ActionConfig => ({
    type,
    icon: config.icon!,
    label: config.label || type,
    presentation: config.presentation || PresentationType.MODAL,
    buttonStyle: config.buttonStyle || 'icon',
    component: config.component,
    props: config.props || {},
    handleAction: config.handleAction,
    shouldShow: config.shouldShow,
    containerProps: config.containerProps || {},
    renderContainer: config.renderContainer,
    target: config.target
});
