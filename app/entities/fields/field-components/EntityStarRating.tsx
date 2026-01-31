// app/entities/fields/EntityStarRating.tsx

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Star } from "@mynaui/icons-react";
import { EntityComponentBaseProps } from "../types";

interface EntityStarRatingProps extends EntityComponentBaseProps {
    color?: "amber" | "slate" | "red" | "green";
    size: "sm" | "md" | "lg";
    viewOnly?: boolean;
}

const EntityStarRating = React.forwardRef<HTMLDivElement, EntityStarRatingProps>(
    ({
        entityKey,
        dynamicFieldInfo,
        value = 0,
        onChange,
        disabled = false,
        size = "md",
        variant = "default",
        floatingLabel = false,
        className,
        ...props
    }, ref) => {
        const customProps = dynamicFieldInfo.componentProps as Record<string, unknown>;
        const color = (customProps?.color as EntityStarRatingProps['color']) ?? "amber";
        const viewOnly = (customProps?.viewOnly as boolean) ?? false;

        // Ensure value is within bounds and properly rounded
        const normalizedValue = useMemo(() => {
            const numValue = Number(value);
            if (isNaN(numValue)) return 0;
            if (numValue > 5) return 5;
            if (numValue < 0) return 0;
            return Math.round(numValue);
        }, [value]);

        const starColor = {
            amber: "text-amber-500",
            slate: "text-muted-foreground",
            red: "text-red-500",
            green: "text-emerald-500",
        };

        const starSize = {
            sm: "size-3",
            md: "size-5",
            lg: "size-8",
        };

        const handleStarClick = (rating: number) => {
            if (!disabled && onChange) {
                onChange(rating);
            }
        };

        const StarSVG = ({ filled }: { filled: boolean }) => (
            <Star
                className={cn(
                    "shrink-0",
                    filled ? starColor[color] : "text-border",
                    starSize[size],
                    disabled && "opacity-50"
                )}
                fill="currentColor"
            />
        );

        const stars = useMemo(() => {
            return Array.from({ length: 5 }, (_, index) => {
                const starNumber = index + 1;
                if (viewOnly && starNumber === 1) {
                    return (
                        <StarSVG
                            key={`star-${starNumber}`}
                            filled={normalizedValue >= starNumber}
                        />
                    );
                }

                return (
                    <button
                        key={`star-${starNumber}`}
                        className={cn(
                            "appearance-none",
                            disabled && "cursor-not-allowed"
                        )}
                        type="button"
                        aria-label={`Rate ${starNumber} out of 5 stars`}
                        onClick={() => handleStarClick(starNumber)}
                        disabled={disabled}
                    >
                        <StarSVG filled={normalizedValue >= starNumber} />
                    </button>
                );
            });
        }, [normalizedValue, disabled, viewOnly]);

        return (
            <div
                ref={ref}
                className={cn(
                    "flex gap-1",
                    className
                )}
            >
                {stars}
            </div>
        );
    }
);

EntityStarRating.displayName = "EntityStarRating";

export default React.memo(EntityStarRating);