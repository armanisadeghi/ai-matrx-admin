// @ts-nocheck
// useFieldActions.ts
import {useState} from "react";

import {ActionRegistryEntry} from "@/components/matrx/ArmaniForm/action-system/types";
import {PresentationProps} from "@/components/matrx/ArmaniForm/action-system/presentation";
import {TriggerProps} from "@/components/matrx/ArmaniForm/action-system/triggers";
import {cn} from "@/utils/cn";

interface UseFieldActionsProps {
    field: any;
    matrxAction: ActionRegistryEntry[];
    value: any;
    onChange: (value: any) => void;
    onActionComplete?: (isOpen: boolean) => void;
}

export const useFieldActions = ({
        field,
        matrxAction,
        value,
        onChange,
        onActionComplete
}: UseFieldActionsProps) => {
  const [openStates, setOpenStates] = useState<Record<number, boolean>>({});

  const handleOpenChange = (index: number, open: boolean) => {
    setOpenStates(prev => ({
      ...prev,
      [index]: open
    }));
        onActionComplete?.(open);
    };


  const getActionProps = (matrxAction: ActionRegistryEntry, index: number) => {
    const getPresentationProps = (): PresentationProps => {
        const {presentationConfig} = matrxAction;

        return {
            ...presentationConfig.props,
            variant: presentationConfig.props.variant,
            // @ts-ignore - COMPLEX: Missing required properties 'trigger' and 'content' in PresentationProps - needs manual implementation
            trigger: null as any,
            content: null as any,
            config: {
                allowBackgroundInteraction: false,
                preventScroll: true,
                closeOnOutsideClick: true,
                closeOnEscape: true,
                ...presentationConfig.props.config
            },
            controls: {
                showClose: true,
                showSave: false,
                showCancel: false,
                showConfirm: false,
                ...presentationConfig.props.controls
            },
        onOpenChange: (open) => handleOpenChange(index, open),
            className: cn(
                presentationConfig.props.className,
                'matrx-presentation'
            )
        };
    };

    const getTriggerProps = (): TriggerProps => {
        const {triggerConfig} = matrxAction;
        // @ts-ignore - COMPLEX: triggerConfig.props may have nested eventHandlers/uiProps structure
        // that needs to be flattened to match TriggerProps interface
        const existingProps = triggerConfig.props || {};
        const existingEventHandlers = existingProps.eventHandlers || {};
        const existingUIProps = existingProps.uiProps || {};

        return {
            ...existingProps,
            // Flatten event handlers
            onClick: existingEventHandlers.onClick || (() => handleOpenChange(index, true)),
            onChange: existingEventHandlers.onChange,
            onValueChange: existingEventHandlers.onValueChange,
            onCheckedChange: existingEventHandlers.onCheckedChange,
            // Flatten UI props
            tooltip: existingUIProps.tooltip || triggerConfig.props.label,
            side: existingUIProps.side || 'top',
            menuLabel: existingUIProps.menuLabel,
            src: existingUIProps.src,
            alt: existingUIProps.alt,
            component: existingUIProps.component,
            active: existingUIProps.active,
            // Flatten data props if they exist
            // @ts-ignore - COMPLEX: dataProps may exist in triggerConfig.props
            checked: existingProps.dataProps?.checked ?? existingProps.checked,
            // @ts-ignore - COMPLEX: dataProps may exist in triggerConfig.props
            value: existingProps.dataProps?.value ?? existingProps.value,
            // @ts-ignore - COMPLEX: dataProps may exist in triggerConfig.props
            options: existingProps.dataProps?.options ?? existingProps.options,
        };
    };

      const getActionComponentProps = () => {
          const { actionComponentConfig } = matrxAction;
          if (!actionComponentConfig) return null;

          return {
              ...actionComponentConfig.props,
              entityKey: field.componentProps.frontendTablename,
              onSelectionChange: (recordId: string | string[]) => {
                  onChange(recordId);
                  handleOpenChange(index, false);
              },
              onAnyChange: (
                  entityKey: string,
                  selectionMode: string,
                  selectedRecordIds: string[],
                  selectedRecords: Record<string, any>[]
              ) => {
                  // Handle the onAnyChange event
                  console.log({
                      entityKey,
                      selectionMode,
                      selectedRecordIds,
                      selectedRecords
                  });
              },
              showCreateNewButton: actionComponentConfig.props.showCreateNewButton ?? true
          };
      };

    return {
      isOpen: openStates[index] || false,
        presentationProps: getPresentationProps(),
        triggerProps: getTriggerProps(),
        actionComponentProps: getActionComponentProps()
    };
};

  return matrxAction.map((action, index) => getActionProps(action, index));
};
