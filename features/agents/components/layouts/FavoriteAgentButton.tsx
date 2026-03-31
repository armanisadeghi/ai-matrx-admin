"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectAgentById } from "@/features/agents/redux/agent-definition/selectors";
import { saveAgentField } from "@/features/agents/redux/agent-definition/thunks";

interface FavoriteAgentButtonProps {
  id: string;
  disabled?: boolean;
}

export function FavoriteAgentButton({
  id,
  disabled,
}: FavoriteAgentButtonProps) {
  const dispatch = useAppDispatch();
  const record = useAppSelector((state) => selectAgentById(state, id));
  const isFavorite = record?.isFavorite ?? false;
  const isOwner = record?.isOwner ?? true;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || !isOwner) return;
    dispatch(saveAgentField({ id, field: "isFavorite", value: !isFavorite }));
  };

  return (
    <button
      className={cn(
        "absolute top-2.5 right-2.5 z-10 p-1 rounded-full transition-all duration-200",
        disabled || !isOwner
          ? "opacity-40 cursor-not-allowed"
          : "hover:scale-110 active:scale-95",
        isFavorite
          ? "text-yellow-400"
          : "text-muted-foreground hover:text-yellow-400",
      )}
      onClick={handleClick}
      title={
        isOwner
          ? isFavorite
            ? "Remove from favorites"
            : "Add to favorites"
          : "Shared — cannot favorite"
      }
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      <Star
        className={cn(
          "w-4 h-4 transition-all",
          isFavorite && "fill-yellow-400",
        )}
      />
    </button>
  );
}
