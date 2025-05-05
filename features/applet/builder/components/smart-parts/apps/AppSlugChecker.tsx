"use client";

import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectAppSlugStatus } from "@/lib/redux/app-builder/selectors/appSelectors";
import { checkAppSlugUniqueness } from "@/lib/redux/app-builder/thunks/appBuilderThunks";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

// Helper component for checking app slug availability
export const AppSlugChecker = ({ appId, slug }: { appId?: string; slug: string }) => {
    const dispatch = useAppDispatch();
    const slugStatus = useAppSelector((state) => (appId ? selectAppSlugStatus(state, appId) : "unchecked"));

    const handleCheckSlugAvailability = async () => {
        if (!slug) return;

        try {
            await dispatch(
                checkAppSlugUniqueness({
                    slug,
                    appId,
                })
            );
        } catch (error) {
            console.error("Error checking slug uniqueness:", error);
        }
    };

    const renderSlugStatusIcon = () => {
        switch (slugStatus) {
            case "unique":
                return (
                    <Tooltip>
                        <TooltipTrigger>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        </TooltipTrigger>
                        <TooltipPrimitive.Portal>
                            <TooltipContent side="top" align="center" sideOffset={5} className="z-[9999] py-1 px-2">
                                Slug is available and unique
                            </TooltipContent>
                        </TooltipPrimitive.Portal>
                    </Tooltip>
                );
            case "notUnique":
                return (
                    <Tooltip>
                        <TooltipTrigger>
                            <XCircle className="h-4 w-4 text-red-500" />
                        </TooltipTrigger>
                        <TooltipPrimitive.Portal>
                            <TooltipContent side="top" align="center" sideOffset={5} className="z-[9999] py-1 px-2">
                                This slug is already in use
                            </TooltipContent>
                        </TooltipPrimitive.Portal>
                    </Tooltip>
                );
            default:
                return slug ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                onClick={handleCheckSlugAvailability}
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 p-0 text-amber-500 hover:text-amber-600 hover:bg-transparent"
                            >
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipPrimitive.Portal>
                            <TooltipContent side="top" align="center" sideOffset={5} className="z-[9999] py-1 px-2">
                                Click to check slug availability
                            </TooltipContent>
                        </TooltipPrimitive.Portal>
                    </Tooltip>
                ) : null;
        }
    };

    return (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">{renderSlugStatusIcon()}</div>
    );
}; 