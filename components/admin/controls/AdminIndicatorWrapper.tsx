// components/AdminIndicatorWrapper.tsx
"use client";

import React from "react";
import AdminIndicator from "./AdminIndicator";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsOverlayOpen } from "@/lib/redux/slices/overlaySlice";
import { RootState } from "@/lib/redux";
import { adminIds } from "@/components/layout";


const AdminIndicatorWrapper = () => {
    const user = useAppSelector((state: RootState) => state.user);
    const isOverlayOpen = useAppSelector((state) => selectIsOverlayOpen(state, "adminIndicator"));
    
    const isAdmin = adminIds.includes(user.id);

    // Only render if user is admin AND the overlay is open
    if (!isAdmin || !isOverlayOpen) return null;

    return <AdminIndicator user={user} />;
};

export default AdminIndicatorWrapper;
