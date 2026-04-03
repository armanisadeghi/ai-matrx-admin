"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectAgentById } from "@/features/agents/redux/agent-definition/selectors";
import { saveAgentField } from "@/features/agents/redux/agent-definition/thunks";

interface FavoriteAgentButtonProps {
  id: string;
  /** "card" = absolute-positioned corner star, "list" = inline icon button */
  variant?: "card" | "list";
  disabled?: boolean;
}

export function FavoriteAgentButton({
  id,
  variant = "card",
  disabled,
}: FavoriteAgentButtonProps) {
  const dispatch = useAppDispatch();
  const record = useAppSelector((state) => selectAgentById(state, id));
  const isFavorite = record?.isFavorite ?? false;
  const isOwner = record?.isOwner ?? true;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || !isOwner) return;
    dispatch(
      saveAgentField({ agentId: id, field: "isFavorite", value: !isFavorite }),
    );
  };

  const title = isOwner
    ? isFavorite
      ? "Remove from favorites"
      : "Add to favorites"
    : "Shared — cannot favorite";

  if (variant === "list") {
    return (
      <button
        className={cn(
          "flex-shrink-0 p-0.5 rounded transition-all duration-150",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          disabled || !isOwner
            ? "cursor-not-allowed"
            : "hover:scale-110 cursor-pointer",
        )}
        onClick={handleClick}
        disabled={disabled || !isOwner}
        title={title}
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <Star
          className={cn(
            "h-3.5 w-3.5 transition-all duration-150",
            isFavorite
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/40 hover:text-amber-400",
          )}
        />
      </button>
    );
  }

  return (
    <button
      className={cn(
        "absolute top-2.5 right-2.5 z-10 p-0.5 rounded transition-all duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        disabled || !isOwner
          ? "cursor-not-allowed"
          : "hover:scale-110 cursor-pointer",
        isFavorite
          ? "text-amber-400"
          : "text-muted-foreground/40 hover:text-amber-400",
      )}
      onClick={handleClick}
      disabled={disabled || !isOwner}
      title={title}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      <Star
        className={cn(
          "w-4 h-4 transition-all duration-150",
          isFavorite && "fill-amber-400",
        )}
      />
    </button>
  );
}
