// app/(authenticated)/apps/demo/layout.tsx
"use client";

import { ReactNode } from "react";

export default function DynamicLayout({ children }: { children: ReactNode }) {

    return <div className="h-full w-full transition-colors">{children}</div>;
}
