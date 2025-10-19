// app\(authenticated)\apps\dynamic-layouts\layout.tsx
"use client";

import { ReactNode } from "react";

export default function DynamicLayout({ children }: { children: ReactNode }) {

    return <div className="h-full w-full bg-textured transition-colors">{children}</div>;
}
