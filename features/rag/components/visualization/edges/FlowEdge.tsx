"use client";

/**
 * FlowEdge — animated edge that visualizes data flowing between nodes.
 *
 * Three layered renders:
 *   1) idle base path — thin, low-opacity, always visible
 *   2) active overlay path — thicker, full-color, with flowing dashed stroke
 *   3) traveling particle — an SVG <circle> with <animateMotion> riding the path
 *
 * The edge label sits above the path mid-point and lights up alongside the
 * edge. `data.variant` selects the color theme; `data.active` toggles flow.
 */

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import { cn } from "@/lib/utils";

export type FlowEdgeVariant = "read" | "write" | "store";

export interface FlowEdgeData extends Record<string, unknown> {
  variant: FlowEdgeVariant;
  label?: string;
  /** Currently flowing — animated dashes + traveling particle. Beats `complete`. */
  active?: boolean;
  /** Already finished flowing — solid emerald, no animation, soft glow. */
  complete?: boolean;
  /** Speed of the moving particle in seconds (default 1.4) */
  particleDuration?: number;
}

const VARIANT_COLOR: Record<
  FlowEdgeVariant,
  { active: string; idle: string; particle: string }
> = {
  read: {
    active: "rgb(167 139 250)", // violet-400
    idle: "rgb(139 92 246 / 0.25)", // violet-500/25
    particle: "rgb(196 181 253)", // violet-300
  },
  write: {
    active: "rgb(34 211 238)", // cyan-400
    idle: "rgb(6 182 212 / 0.25)", // cyan-500/25
    particle: "rgb(103 232 249)", // cyan-300
  },
  store: {
    active: "rgb(52 211 153)", // emerald-400
    idle: "rgb(16 185 129 / 0.25)", // emerald-500/25
    particle: "rgb(110 231 183)", // emerald-300
  },
};

function FlowEdgeImpl(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
  } = props;

  const d = (data ?? { variant: "write" }) as FlowEdgeData;
  const colors = VARIANT_COLOR[d.variant];
  const isActive = !!d.active;
  const isComplete = !isActive && !!d.complete;
  const completeColors = VARIANT_COLOR.store; // emerald for finished work

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 18,
  });

  const motionPathId = `flow-motion-${id}`;
  const particleDur = d.particleDuration ?? 1.4;

  return (
    <>
      {/* Idle base path — always rendered */}
      <BaseEdge
        path={edgePath}
        style={{
          stroke: isComplete ? completeColors.active : colors.idle,
          strokeWidth: isComplete ? 2 : 1.5,
          fill: "none",
          filter: isComplete
            ? `drop-shadow(0 0 4px ${completeColors.active})`
            : undefined,
        }}
      />

      {/* Active overlay — flowing dashes */}
      {isActive && (
        <>
          <path
            id={motionPathId}
            d={edgePath}
            style={{
              stroke: colors.active,
              strokeWidth: 2,
              fill: "none",
              strokeDasharray: "6 6",
              strokeLinecap: "round",
              filter: `drop-shadow(0 0 6px ${colors.active})`,
              animation: "ragFlowDash 0.9s linear infinite",
            }}
          />

          {/* Traveling particle */}
          <circle
            r={3.5}
            fill={colors.particle}
            style={{
              filter: `drop-shadow(0 0 6px ${colors.active})`,
            }}
          >
            <animateMotion
              dur={`${particleDur}s`}
              repeatCount="indefinite"
              rotate="auto"
              keyPoints="0;1"
              keyTimes="0;1"
            >
              <mpath href={`#${motionPathId}`} />
            </animateMotion>
          </circle>

          {/* A second, slightly delayed particle for a richer flow */}
          <circle r={2.5} fill={colors.particle} opacity={0.7}>
            <animateMotion
              dur={`${particleDur}s`}
              begin={`${particleDur / 2}s`}
              repeatCount="indefinite"
              rotate="auto"
            >
              <mpath href={`#${motionPathId}`} />
            </animateMotion>
          </circle>
        </>
      )}

      {/* Label */}
      {d.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "none",
            }}
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide",
              "bg-background/85 backdrop-blur",
              "transition-[color,border-color,box-shadow] duration-300",
              isActive
                ? d.variant === "read"
                  ? "text-violet-500 dark:text-violet-300 border-violet-400/60 shadow-[0_0_10px_-2px_rgb(167_139_250_/_0.6)]"
                  : d.variant === "write"
                    ? "text-cyan-500 dark:text-cyan-300 border-cyan-400/60 shadow-[0_0_10px_-2px_rgb(34_211_238_/_0.6)]"
                    : "text-emerald-500 dark:text-emerald-300 border-emerald-400/60 shadow-[0_0_10px_-2px_rgb(52_211_153_/_0.6)]"
                : isComplete
                  ? "text-emerald-500/90 dark:text-emerald-300/90 border-emerald-400/40"
                  : "text-muted-foreground/80 border-border",
            )}
          >
            {d.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const FlowEdge = memo(FlowEdgeImpl);
