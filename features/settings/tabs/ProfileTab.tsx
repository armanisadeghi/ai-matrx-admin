"use client";

import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const ProfilePage = lazy(
  () => import("@/app/(authenticated)/settings/profile/page"),
);

export default function ProfileTab() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ProfilePage />
    </Suspense>
  );
}
