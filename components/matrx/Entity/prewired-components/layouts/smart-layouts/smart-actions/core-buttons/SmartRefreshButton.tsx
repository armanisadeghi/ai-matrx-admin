import { useEntityCrud } from "@/lib/redux/entity/hooks/useEntityCrud";
import { useCallback } from "react";
import SmartButtonBase from "./SmartButtonBase";
import {SmartButtonProps} from "../types";
import { RotateCw } from "lucide-react";

export interface SmartRefreshButtonProps extends SmartButtonProps {
    hideText?: boolean;
}

export const SmartRefreshButton = ({
    entityKey,
    size = 'default',
    hideText = false
}: SmartRefreshButtonProps) => {
    const entityCrud = useEntityCrud(entityKey);
    const { setMode } = entityCrud;

    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();

        setMode('view');

        // TODO: Add your fetch/refresh logic here after the flags are reset
    }, [setMode]);

    return (
        <SmartButtonBase
            entityKey={entityKey}
            onClick={handleClick}
            size={size}
            variant="outline"
        >
            <RotateCw className="h-4 w-4" />
            {!hideText && "Refresh"}
        </SmartButtonBase>
    );
};

SmartRefreshButton.displayName = 'SmartRefreshButton';

export default SmartRefreshButton;
