"use client";

import dynamic from "next/dynamic";

const CanvasSideSheetInner = dynamic(
    () => import("./CanvasSideSheetInner").then((m) => m.CanvasSideSheetInner),
    { ssr: false }
);

export function CanvasSideSheet() {
    return <CanvasSideSheetInner />;
}
