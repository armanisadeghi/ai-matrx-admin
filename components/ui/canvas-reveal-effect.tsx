"use client";
import dynamic from "next/dynamic";
import React from "react";
import { cn } from "@/lib/utils";

interface CanvasRevealEffectProps {
    animationSpeed?: number;
    opacities?: number[];
    colors?: number[][];
    containerClassName?: string;
    dotSize?: number;
    showGradient?: boolean;
}

const CanvasRevealEffectImpl = dynamic(
    () => import("./canvas-reveal-effect-impl").then(mod => ({ default: mod.CanvasRevealEffect })),
    {
        ssr: false,
        loading: () => <div className="h-full w-full" />,
    }
);

export const CanvasRevealEffect = (props: CanvasRevealEffectProps) => {
    return <CanvasRevealEffectImpl {...props} />;
};
