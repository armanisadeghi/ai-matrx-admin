// components/MatrxBaseInput.tsx

import { Input } from "@/components/ui";
import {cn} from "@/utils/cn";
import React from "react";
import { MatrxBaseInputProps } from "../../../../../types/componentConfigTypes";
import {densityConfig, getComponentStyles} from "../../../../../config/ui/FlexConfig";

const MatrxBaseInput = React.forwardRef<HTMLInputElement, MatrxBaseInputProps>(
    ({
         startAdornment,
         endAdornment,
         className,
         size = 'md',
         density = 'normal',
         variant = 'default',
         disabled = false,
         error,
         state = disabled ? 'disabled' : error ? 'error' : 'idle',
         ...props
     }, ref) => {
        const densityStyles = densityConfig[density];

        return (
            <div className="relative">
                {startAdornment && (
                    <div className={cn(
                        "absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground",
                        disabled && "opacity-50"
                    )}>
                        {startAdornment}
                    </div>
                )}
                <Input
                    ref={ref}
                    className={cn(
                        getComponentStyles({ size, density, variant, state }),
                        startAdornment && "pl-8",
                        endAdornment && "pr-8",
                        className
                    )}
                    disabled={disabled}
                    {...props}
                />
                {endAdornment && (
                    <div className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground",
                        disabled && "opacity-50"
                    )}>
                        {endAdornment}
                    </div>
                )}
            </div>
        );
    }
);
export default MatrxBaseInput;

MatrxBaseInput.displayName = "MatrxBaseInput";
