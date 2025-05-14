"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectAppletSlugStatus } from "@/lib/redux/app-builder/selectors/appletSelectors";
import { checkAppletSlugUniqueness } from "@/lib/redux/app-builder/thunks/appletBuilderThunks";

// Helper component for checking applet slug availability
export const AppletSlugChecker = ({ appletId, slug }: { appletId?: string; slug: string }) => {
    const dispatch = useAppDispatch();
    const slugStatus = useAppSelector((state) => (appletId ? selectAppletSlugStatus(state, appletId) : "unchecked"));

    const handleCheckSlugAvailability = async () => {
        if (!slug) return;

        try {
            await dispatch(
                checkAppletSlugUniqueness({
                    slug,
                    appletId,
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
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Slug is available and unique</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            case "notUnique":
                return (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <XCircle className="h-4 w-4 text-red-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>This slug is already in use</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            default:
                return slug ? (
                    <TooltipProvider>
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
                            <TooltipContent>
                                <p>Click to check slug availability</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ) : null;
        }
    };

    return <div className="absolute right-3 top-1/2 transform -translate-y-1/2">{renderSlugStatusIcon()}</div>;
};
