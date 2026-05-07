"use client";

/**
 * DataStoreNode — the centerpiece where both paths converge.
 *
 * Visualized as a stacked "vector index" — three layered discs with a
 * gradient backplate. When `active` is true (i.e. data is flowing in or
 * out) it pulses dramatically; otherwise it has a subtle ambient pulse
 * so the user always knows it's the heart of the system.
 *
 * Two top handles (left + right) accept the converging read/write edges,
 * and a single bottom handle emits the retrieved top-K chunks.
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion } from "motion/react";
import { Database } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DataStoreNodeData extends Record<string, unknown> {
  active?: boolean;
  ingesting?: boolean;
  querying?: boolean;
}

function DataStoreNodeImpl({ data }: NodeProps) {
  const d = data as DataStoreNodeData;
  const isActive = d.active || d.ingesting || d.querying;

  return (
    <motion.div
      animate={{
        scale: isActive ? 1.05 : 1,
      }}
      transition={{ type: "spring", stiffness: 220, damping: 24 }}
      className="relative"
    >
      {/* Two top handles for the converging paths */}
      <Handle
        id="in-read"
        type="target"
        position={Position.Top}
        className="!w-1 !h-1 !min-w-1 !min-h-1 !border-0 !bg-transparent"
        style={{ top: 0, left: "30%" }}
      />
      <Handle
        id="in-write"
        type="target"
        position={Position.Top}
        className="!w-1 !h-1 !min-w-1 !min-h-1 !border-0 !bg-transparent"
        style={{ top: 0, left: "70%" }}
      />

      {/* Outer ambient glow — pulses softly even when idle */}
      <motion.div
        aria-hidden
        className="absolute inset-0 -m-4 rounded-[28px] bg-gradient-to-br from-violet-500/30 via-fuchsia-500/20 to-cyan-500/30 blur-2xl"
        animate={{
          opacity: isActive ? [0.7, 1, 0.7] : [0.25, 0.4, 0.25],
          scale: isActive ? [1, 1.08, 1] : [1, 1.03, 1],
        }}
        transition={{
          duration: isActive ? 1.4 : 3.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Body */}
      <div
        className={cn(
          "relative flex flex-col items-center justify-center gap-2",
          "rounded-2xl border-2 px-7 py-5 min-w-[260px]",
          "bg-gradient-to-br from-background via-background to-violet-500/5",
          "transition-colors duration-300",
          isActive
            ? "border-fuchsia-400/80 shadow-[0_0_50px_-8px_rgb(217_70_239_/_0.65)]"
            : "border-fuchsia-500/30 shadow-[0_0_30px_-10px_rgb(217_70_239_/_0.4)]",
        )}
      >
        {/* Stacked vector layers */}
        <div className="relative h-12 w-32">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              aria-hidden
              className={cn(
                "absolute inset-x-0 h-3 rounded-full",
                "bg-gradient-to-r from-violet-500/70 via-fuchsia-500/70 to-cyan-500/70",
              )}
              style={{ top: i * 15 }}
              animate={{
                opacity: isActive ? [0.5, 1, 0.5] : [0.35, 0.6, 0.35],
                scaleX: isActive ? [0.92, 1, 0.92] : [0.95, 1, 0.95],
              }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.18,
              }}
            />
          ))}
          <Database
            className="absolute inset-0 m-auto h-6 w-6 text-foreground/85"
            strokeWidth={1.6}
          />
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[11px] font-bold tracking-[0.2em] text-foreground/85 uppercase">
            Data Store
          </span>
          <span className="text-[10px] text-muted-foreground tracking-wide">
            vector index
          </span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-1 !h-1 !min-w-1 !min-h-1 !border-0 !bg-transparent"
        style={{ bottom: 0 }}
      />
    </motion.div>
  );
}

export const DataStoreNode = memo(DataStoreNodeImpl);
