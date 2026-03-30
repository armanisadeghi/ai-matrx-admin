// components/AdminIndicatorWrapper.tsx
"use client";

import React, { Suspense } from "react";
import AdminIndicator from "./AdminIndicator";
import { AdminDebugContextCollector } from "@/components/admin/debug/AdminDebugContextCollector";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsOverlayOpen } from "@/lib/redux/slices/overlaySlice";
import { selectIsAdmin } from "@/lib/redux/slices/userSlice";

const AdminIndicatorWrapper = () => {
  const isAdmin = useAppSelector(selectIsAdmin);
  const isOverlayOpen = useAppSelector((state) =>
    selectIsOverlayOpen(state, "adminIndicator"),
  );

  // Non-admins get nothing — no download, no render, no overhead.
  if (!isAdmin) return null;

  return (
    <>
      {/* Auto-captures pathname, console errors, browser metadata for every admin session */}
      <Suspense fallback={null}>
        <AdminDebugContextCollector />
      </Suspense>
      {isOverlayOpen && <AdminIndicator />}
    </>
  );
};

export default AdminIndicatorWrapper;
