"use client";
import React from "react";
import { getBezierPath, type EdgeProps } from "reactflow";
interface CustomEdgeProps extends EdgeProps {
    onEdgeClick?: (edge: EdgeProps) => void;
}
export default function CustomEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
    onEdgeClick,
    ...edgeProps
}: CustomEdgeProps) {
    const xEqual = sourceX === targetX;
    const yEqual = sourceY === targetY;
    const [edgePath, labelX, labelY] = getBezierPath({
        // we need this little hack in order to display the gradient for a straight line
        sourceX: xEqual ? sourceX + 0.0001 : sourceX,
        sourceY: yEqual ? sourceY + 0.0001 : sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });
    // Get label from data
    const label = data?.label;
    const connectionType = data?.connectionType;
    const handleEdgeClick = (event: React.MouseEvent) => {
        event.stopPropagation();
        if (onEdgeClick) {
            onEdgeClick({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, data, ...edgeProps });
        }
    };
    return (
        <>
            <defs>
                <linearGradient id={`edge-gradient-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(var(--secondary))" />
                </linearGradient>
            </defs>
            <path
                id={id}
                style={{
                    ...style,
                    stroke: `url(#edge-gradient-${id})`,
                    strokeWidth: 2,
                    strokeOpacity: 0.75,
                    cursor: "pointer",
                }}
                className="react-flow__edge-path hover:stroke-opacity-100 transition-all duration-200"
                d={edgePath}
                markerEnd={markerEnd}
                onClick={handleEdgeClick}
            />
            {label && (
                <foreignObject
                    width={200}
                    height={24}
                    x={labelX - 100}
                    y={labelY - 12}
                    requiredExtensions="http://www.w3.org/1999/xhtml"
                    onClick={handleEdgeClick}
                    className="cursor-pointer"
                >
                    <div className="flex justify-center">
                        <span
                            className={`
                inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-normal
                bg-white dark:bg-gray-800 
                border shadow-sm transition-colors hover:shadow-md
                whitespace-nowrap overflow-hidden text-ellipsis max-w-[180px]
                ${
                    connectionType === "to_argument"
                        ? "border-emerald-300 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50"
                        : connectionType === "to_relay"
                        ? "border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50"
                        : connectionType === "to_dependency"
                        ? "border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50"
                        : "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                }`}
                        >
                            {label}
                        </span>
                    </div>
                </foreignObject>
            )}
        </>
    );
}