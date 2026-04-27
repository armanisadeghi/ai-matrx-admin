"use client";

import { Group, type GroupProps } from "react-resizable-panels";

type Props = Omit<GroupProps, "onLayoutChange" | "onLayoutChanged"> & {
  cookieName: string;
};

// Thinnest possible 'use client' wrapper around <Group>.
// Exists ONLY so we can attach a function prop (onLayoutChanged) — function
// props can't cross the RSC boundary, so the parent server component cannot
// pass it directly. Reusable for any cookie-backed group: just pass cookieName.
export function ClientGroup({ cookieName, ...props }: Props) {
  return (
    <Group
      {...props}
      onLayoutChanged={(layout) => {
        // Past tense: fires on pointer-up, not every mousemove.
        // The present-tense onLayoutChange fires on every drag tick → cookie
        // write storm. Use onLayoutChanged for persistence.
        document.cookie =
          `${cookieName}=${encodeURIComponent(JSON.stringify(layout))}` +
          `; path=/; max-age=31536000; SameSite=Lax`;
      }}
    />
  );
}
