"use client";

import { Group, type GroupProps } from "react-resizable-panels";

type Props = Omit<GroupProps, "onLayoutChange" | "onLayoutChanged"> & {
  cookieName: string;
};

// Thin 'use client' wrapper around <Group> that writes the layout to a cookie
// on pointer-up. Reusable across demos: pass a different cookieName per Group.
// Server pages stay server components and pass `defaultLayout` (read from the
// same cookie via readLayoutCookie) so the first paint matches the persisted
// state with no flash.
export function ClientGroup({ cookieName, ...props }: Props) {
  return (
    <Group
      {...props}
      onLayoutChanged={(layout) => {
        document.cookie =
          `${cookieName}=${encodeURIComponent(JSON.stringify(layout))}` +
          `; path=/; max-age=31536000; SameSite=Lax`;
      }}
    />
  );
}
