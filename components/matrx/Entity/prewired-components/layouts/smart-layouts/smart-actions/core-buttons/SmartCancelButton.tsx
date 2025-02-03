'use client';

import React, { useCallback, useMemo } from "react";
import { X } from "lucide-react";
import SmartButtonBase from "./SmartButtonBase";
import { SmartButtonProps } from "../types";
import { createEntitySelectors, getEntitySlice, useAppDispatch, useAppSelector } from "@/lib/redux";

export const SmartCancelButton = ({ entityKey, size = 'default', forceEnable }: SmartButtonProps) => {
    const dispatch = useAppDispatch();
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const { actions } = useMemo(() => getEntitySlice(entityKey), [entityKey]);
    const operationMode = useAppSelector(selectors.selectOperationMode);

    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        dispatch(actions.cancelOperation());
    }, [dispatch, actions]);

    const isDisabled = operationMode === 'view';

    return (
        <SmartButtonBase
            entityKey={entityKey}
            onClick={handleClick}
            disabled={isDisabled}
            size={size}
            variant="outline"
            forceEnable={forceEnable}
        >
            <X className="h-4 w-4" />
            Cancel
        </SmartButtonBase>
    );
};

SmartCancelButton.displayName = 'SmartCancelButton';

export default SmartCancelButton;