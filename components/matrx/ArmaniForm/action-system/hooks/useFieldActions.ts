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

        return {
            ...triggerConfig.props,
            eventHandlers: {
          onClick: () => handleOpenChange(index, true),
                ...triggerConfig.props.eventHandlers
            },
            uiProps: {
                tooltip: triggerConfig.props.label,
                side: 'top',
                ...triggerConfig.props.uiProps
            }
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
