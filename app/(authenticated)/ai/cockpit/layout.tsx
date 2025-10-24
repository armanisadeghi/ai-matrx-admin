// /layout.tsx

import React from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="h-full overflow-hidden">
    {children}</div>;
}
