"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/lib/redux/hooks";
import { upsertPromptInList } from "@/lib/redux/slices/promptCacheSlice";
import { updateUserPrompt } from "@/lib/redux/thunks/promptCrudThunks";
import { toast } from "@/lib/toast-service";
import type { PromptData } from "../../types/core";

interface FavoriteButtonProps {
  id: string;
  promptData?: PromptData;
  isFavorite?: boolean;
  /** "card" = absolute-positioned corner star, "list" = inline icon button */
  variant?: "card" | "list";
  disabled?: boolean;
  className?: string;
}

export function FavoriteButton({
  id,
  promptData,
  isFavorite: isFavoriteProp,
  variant = "card",
  disabled = false,
  className,
}: FavoriteButtonProps) {
  const dispatch = useAppDispatch();
  // Allow prop to be the source of truth; fall back to promptData
  const resolvedInitial = isFavoriteProp ?? promptData?.isFavorite ?? false;
  const [optimisticFavorite, setOptimisticFavorite] = useState(resolvedInitial);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || isToggling) return;

    const next = !optimisticFavorite;

    // Optimistic update
    setOptimisticFavorite(next);
    if (promptData) {
      dispatch(upsertPromptInList({ ...promptData, isFavorite: next }));
    }

    setIsToggling(true);
    try {
      await dispatch(
        updateUserPrompt({ id, data: { isFavorite: next } })
      ).unwrap();
    } catch {
      // Rollback on failure
      setOptimisticFavorite(!next);
      if (promptData) {
        dispatch(upsertPromptInList({ ...promptData, isFavorite: !next }));
      }
      toast.error("Failed to update favorite. Please try again.");
    } finally {
      setIsToggling(false);
    }
  };

  if (variant === "card") {
    return (
      <button
        onClick={handleToggle}
        disabled={disabled || isToggling}
        title={optimisticFavorite ? "Remove from favorites" : "Add to favorites"}
        className={cn(
          "absolute top-2.5 right-2.5 z-10 p-0.5 rounded transition-all duration-150",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          !disabled && !isToggling && "hover:scale-110 cursor-pointer",
          (disabled || isToggling) && "cursor-not-allowed",
          className,
        )}
      >
        <Star
          className={cn(
            "h-4 w-4 transition-all duration-150",
            optimisticFavorite
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/40 hover:text-amber-400",
            isToggling && "animate-pulse",
          )}
        />
      </button>
    );
  }

  // list variant — inline, compact
  return (
    <button
      onClick={handleToggle}
      disabled={disabled || isToggling}
      title={optimisticFavorite ? "Remove from favorites" : "Add to favorites"}
      className={cn(
        "flex-shrink-0 p-0.5 rounded transition-all duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        !disabled && !isToggling && "hover:scale-110 cursor-pointer",
        (disabled || isToggling) && "cursor-not-allowed",
        className,
      )}
    >
      <Star
        className={cn(
          "h-3.5 w-3.5 transition-all duration-150",
          optimisticFavorite
            ? "fill-amber-400 text-amber-400"
            : "text-muted-foreground/40 hover:text-amber-400",
          isToggling && "animate-pulse",
        )}
      />
    </button>
  );
}
