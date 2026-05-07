"use client";

/**
 * PipelineNode — used for every step in both the READ and WRITE paths.
 *
 * Two visual variants ("read" | "write") drive the accent color so the user
 * can see, at a glance, which side of the pipeline they're looking at:
 *
 *   read   → violet  (the user's question, classification, agent, query embed)
 *   write  → cyan    (file → cloud → raw → clean → chunks → embeddings)
 *
 * The `active` flag is driven by the orchestrator and lights up the node
 * with a glow ring + scale bump when the data is "passing through" it.
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type PipelineNodeVariant = "read" | "write";

export interface PipelineNodeData extends Record<string, unknown> {
  variant: PipelineNodeVariant;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  active?: boolean;
  /** Hide the source handle (e.g. for the bottom-most node that connects to data store via custom edge) */
  hideSource?: boolean;
  hideTarget?: boolean;
}

const VARIANT_STYLES: Record<
  PipelineNodeVariant,
  {
    idleBorder: string;
    activeBorder: string;
    iconBg: string;
    iconColor: string;
    glow: string;
  }
> = {
  read: {
    idleBorder: "border-violet-500/20",
    activeBorder: "border-violet-400/80",
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-500 dark:text-violet-400",
    glow: "shadow-[0_0_24px_-4px_rgb(139_92_246_/_0.55)]",
  },
  write: {
    idleBorder: "border-cyan-500/20",
    activeBorder: "border-cyan-400/80",
    iconBg: "bg-cyan-500/10",
    iconColor: "text-cyan-500 dark:text-cyan-400",
    glow: "shadow-[0_0_24px_-4px_rgb(34_211_238_/_0.55)]",
  },
};

function PipelineNodeImpl({ data }: NodeProps) {
  const d = data as PipelineNodeData;
  const Icon = d.icon;
  const variant = d.variant;
  const styles = VARIANT_STYLES[variant];

  return (
    <motion.div
      animate={{
        scale: d.active ? 1.04 : 1,
      }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className={cn(
        "relative flex items-center gap-3 rounded-xl border bg-card/80 backdrop-blur",
        "px-3.5 py-2.5 min-w-[200px]",
        "transition-[border-color,box-shadow] duration-300",
        d.active ? styles.activeBorder : styles.idleBorder,
        d.active && styles.glow,
      )}
    >
      {!d.hideTarget && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-1 !h-1 !min-w-1 !min-h-1 !border-0 !bg-transparent"
          style={{ top: 0 }}
        />
      )}

      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg",
          styles.iconBg,
          styles.iconColor,
        )}
      >
        <Icon className="h-4.5 w-4.5" strokeWidth={2} />
      </div>

      <div className="flex flex-col gap-0.5 leading-tight">
        <span className="text-sm font-medium text-foreground">{d.title}</span>
        {d.subtitle && (
          <span className="text-[10.5px] text-muted-foreground tracking-wide uppercase">
            {d.subtitle}
          </span>
        )}
      </div>

      {!d.hideSource && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-1 !h-1 !min-w-1 !min-h-1 !border-0 !bg-transparent"
          style={{ bottom: 0 }}
        />
      )}
    </motion.div>
  );
}

export const PipelineNode = memo(PipelineNodeImpl);
