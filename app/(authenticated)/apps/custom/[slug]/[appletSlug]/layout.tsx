// app/(authenticated)/apps/custom/[slug]/[appletSlug]/layout.tsx
import React from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full w-full overflow-auto">
      {children}
    </div>
  );
}