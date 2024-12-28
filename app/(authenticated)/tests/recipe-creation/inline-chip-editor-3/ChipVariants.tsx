import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChipProps {
  label: string;
  id?: string;
  onRemove?: () => void;
  className?: string;
}

export const GlowBorderChip = ({ label, onRemove, className }: ChipProps) => {
  return (
    <span className={cn("p-[3px] relative inline-flex items-center")}>
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg" />
      <div className="px-8 py-2 bg-black rounded-[6px] relative group transition duration-200 text-white hover:bg-transparent flex items-center gap-1">
        {label}
        {onRemove && (
          <button
            onClick={onRemove}
            className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
            aria-label="Remove chip"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </span>
  );
};

export const ShimmerChip = ({ label, onRemove, className }: ChipProps) => {
  return (
    <span
      className={cn(
        "inline-flex h-12 animate-shimmer items-center justify-center rounded-md border border-slate-800 bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-[length:200%_100%] px-6 font-medium text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50"
      )}
    >
      {label}
      {onRemove && (
        <button
          onClick={onRemove}
          className="hover:bg-primary/20 rounded-full p-0.5 transition-colors ml-2"
          aria-label="Remove chip"
        >
          <X size={14} />
        </button>
      )}
    </span>
  );
};

export const TailwindConnectChip = ({
  label,
  onRemove,
  className,
}: ChipProps) => {
  return (
    <span
      className={cn(
        "bg-slate-800 no-underline group cursor-pointer relative shadow-2xl shadow-zinc-900 rounded-full p-px text-xs font-semibold leading-6 text-white inline-block"
      )}
    >
      <span className="absolute inset-0 overflow-hidden rounded-full">
        <span className="absolute inset-0 rounded-full bg-[image:radial-gradient(75%_100%_at_50%_0%,rgba(56,189,248,0.6)_0%,rgba(56,189,248,0)_75%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      </span>
      <div className="relative flex items-center z-10 rounded-full bg-zinc-950 py-0.5 px-4 ring-1 ring-white/10">
        <span>{label}</span>
        {onRemove && (
          <button
            onClick={onRemove}
            className="hover:bg-primary/20 rounded-full p-0.5 transition-colors ml-2"
            aria-label="Remove chip"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <span className="absolute -bottom-0 left-[1.125rem] h-px w-[calc(100%-2.25rem)] bg-gradient-to-r from-emerald-400/0 via-emerald-400/90 to-emerald-400/0 transition-opacity duration-500 group-hover:opacity-40" />
    </span>
  );
};

export const BorderMagicChip = ({ label, onRemove, className }: ChipProps) => {
  return (
    <span
      className={cn(
        "relative inline-flex h-12 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50",
        className
      )}
    >
      <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
      <span className="inline-flex h-full w-full items-center justify-center rounded-full bg-slate-950 px-3 py-1 text-sm font-medium text-white backdrop-blur-3xl">
        {label}
        {onRemove && (
          <button
            onClick={onRemove}
            className="hover:bg-primary/20 rounded-full p-0.5 transition-colors ml-2"
            aria-label="Remove chip"
          >
            <X size={14} />
          </button>
        )}
      </span>
    </span>
  );
};

export const PlaylistChip = ({ label, onRemove, className }: ChipProps) => {
  return (
    <span
      className={cn(
        "shadow-[inset_0_0_0_2px_#616467] text-black px-12 py-4 rounded-full tracking-widest uppercase font-bold bg-transparent hover:bg-[#616467] hover:text-white dark:text-neutral-200 transition duration-200 inline-flex items-center",
        className
      )}
    >
      {label}
      {onRemove && (
        <button
          onClick={onRemove}
          className="hover:bg-primary/20 rounded-full p-0.5 transition-colors ml-2"
          aria-label="Remove chip"
        >
          <X size={14} />
        </button>
      )}
    </span>
  );
};

export const GreenPopChip = ({ label, onRemove, className }: ChipProps) => {
  return (
    <span
      className={cn(
        "px-12 py-4 rounded-full bg-[#1ED760] font-bold text-white tracking-widest uppercase transform hover:scale-105 hover:bg-[#21e065] transition-colors duration-200 inline-flex items-center",
        className
      )}
    >
      {label}
      {onRemove && (
        <button
          onClick={onRemove}
          className="hover:bg-primary/20 rounded-full p-0.5 transition-colors ml-2"
          aria-label="Remove chip"
        >
          <X size={14} />
        </button>
      )}
    </span>
  );
};

export const TopGradientChip = ({ label, onRemove, className }: ChipProps) => {
  return (
    <div
      className={cn(
        "inline-block px-8 py-2 rounded-full relative bg-slate-700 text-white text-sm hover:shadow-2xl hover:shadow-white/[0.1] transition duration-200 border border-slate-600 items-center",
        className
      )}
      contentEditable={false} // Entire chip is non-editable
      data-content-type="matrx-content" // Add the data attribute here
      style={{ userSelect: "none" }} // Disable text selection

    >
      <div className="absolute inset-x-0 h-px w-1/2 mx-auto -top-px shadow-2xl bg-gradient-to-r from-transparent via-teal-500 to-transparent" />
      <span 
      className="relative z-20"       
      data-content-type="text"
      >
        {label}
        {onRemove && (
          <button
            onClick={onRemove}
            className="hover:bg-primary/20 rounded-full p-0.5 transition-colors ml-2"
            aria-label="Remove chip"
          >
            <X size={14} />
          </button>
        )}
      </span>
    </div>
  );
};

export const CHIP_VARIANTS = {
  glowBorderChip: GlowBorderChip,
  shimmerChip: ShimmerChip,
  tailwindConnectChip: TailwindConnectChip,
  borderMagicChip: BorderMagicChip,
  playlistChip: PlaylistChip,
  greenPopChip: GreenPopChip,
  topGradientChip: TopGradientChip,
};

export const getRandomChip = () => {
  const keys = Object.keys(CHIP_VARIANTS);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return CHIP_VARIANTS[randomKey];
};
