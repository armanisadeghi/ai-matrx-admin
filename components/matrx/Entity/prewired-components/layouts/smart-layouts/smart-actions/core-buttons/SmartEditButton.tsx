import React, { useCallback } from "react";
import { Edit2 } from "lucide-react";
import SmartButtonBase from "./SmartButtonBase";
import {SmartButtonProps} from "../types";
import {createEntitySelectors, getEntitySlice, useAppDispatch, useAppSelector} from "@/lib/redux";


export const SmartEditButton = ({ entityKey, size = 'default' }: SmartButtonProps) => {
    const dispatch = useAppDispatch();
    const selectors = React.useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const {actions} = React.useMemo(() => getEntitySlice(entityKey), [entityKey]);
    const activeRecordId = useAppSelector(selectors.selectActiveRecordId);
    const selectedRecordIds = useAppSelector(selectors.selectSelectedRecordIds);
    const operationMode = useAppSelector(selectors.selectOperationMode);
    const startUpdateMode = useCallback(() => {
        if (activeRecordId || selectedRecordIds.length > 0) {
            dispatch(actions.startRecordUpdate());
        }
    }, [dispatch, actions, activeRecordId, selectedRecordIds]);


    const isDisabled = operationMode !== 'view' ||
        (!activeRecordId && selectedRecordIds.length === 0);

    const handleEdit = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        startUpdateMode();
    }, [startUpdateMode]);

    return (
        <SmartButtonBase
            entityKey={entityKey}
            onClick={handleEdit}
            disabled={isDisabled}
            size={size}
            variant="secondary"
        >
            <Edit2 className="h-4 w-4" />
            Edit
        </SmartButtonBase>
    );
};

SmartEditButton.displayName = 'SmartEditButton';

export default SmartEditButton;
