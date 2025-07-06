import React, { useCallback, useEffect, useState } from "react";
import SmartButtonBase from "./SmartButtonBase";
import {SmartButtonProps} from "../types";
import { RotateCw } from "lucide-react";
import { getEntitySlice, useAppDispatch} from "@/lib/redux";
import { Callback, callbackManager } from "@/utils/callbackManager";

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
    const [isLoading, setIsLoading] = useState(false);

    const startViewMode = useCallback(() => {
        dispatch(actions.setOperationMode("view"));
    }, [dispatch, actions]);

    const fetchAll = React.useCallback((callback?: Callback) => {
        const callbackId = callback ? callbackManager.register(callback) : null;
        dispatch(actions.fetchQuickReference({callbackId,}));
        dispatch(actions.fetchAll({callbackId,}));
    }, [actions, dispatch]);

    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        
        setIsLoading(true);
        
        const refreshCallback: Callback = () => {
            setIsLoading(false);
        };
        
        fetchAll(refreshCallback);
        startViewMode();
    }, [fetchAll, startViewMode]);

    return (
        <SmartButtonBase
            entityKey={entityKey}
            onClick={handleClick}
            size={size}
            variant="outline"
            forceEnable={forceEnable}
            loading={isLoading}
        >
            <RotateCw className="h-4 w-4" />
            {!hideText && "Refresh"}
        </SmartButtonBase>
    );
};

SmartRefreshButton.displayName = 'SmartRefreshButton';

export default SmartRefreshButton;
