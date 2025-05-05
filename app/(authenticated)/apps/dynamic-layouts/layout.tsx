// app\(authenticated)\apps\dynamic-layouts\layout.tsx
"use client";

import { ReactNode } from "react";

export default function DynamicLayout({ children }: { children: ReactNode }) {

    return <div className="h-full w-full bg-white dark:bg-gray-900 transition-colors">{children}</div>;
}
