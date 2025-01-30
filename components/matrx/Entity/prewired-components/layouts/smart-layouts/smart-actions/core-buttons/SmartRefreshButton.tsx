import React, { useCallback } from "react";
import SmartButtonBase from "./SmartButtonBase";
import {SmartButtonProps} from "../types";
import { RotateCw } from "lucide-react";
import { getEntitySlice, useAppDispatch} from "@/lib/redux";

export interface SmartRefreshButtonProps extends SmartButtonProps {
    hideText?: boolean;
}

export const SmartRefreshButton = ({
    entityKey,
    size = 'default',
    hideText = false,
    forceEnable,
}: SmartRefreshButtonProps) => {
    const dispatch = useAppDispatch();
    const {actions} = React.useMemo(() => getEntitySlice(entityKey), [entityKey]);
    const startViewMode = useCallback(() => {
        dispatch(actions.setOperationMode("view"));
    }, [dispatch, actions]);

    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        startViewMode();
    }, []);

    return (
        <SmartButtonBase
            entityKey={entityKey}
            onClick={handleClick}
            size={size}
            variant="outline"
            forceEnable={forceEnable}
        >
            <RotateCw className="h-4 w-4" />
            {!hideText && "Refresh"}
        </SmartButtonBase>
    );
};

SmartRefreshButton.displayName = 'SmartRefreshButton';

export default SmartRefreshButton;
