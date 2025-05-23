// components/AdminIndicatorWrapper.tsx
"use client";

import React from "react";
import AdminIndicator from "./AdminIndicator";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsOverlayOpen } from "@/lib/redux/slices/overlaySlice";
import { RootState } from "@/lib/redux";

export const ADMIN_USER_IDS = [
    "4cf62e4e-2679-484f-b652-034e697418df",
    "8f7f17ba-935b-4967-8105-7c6b554f41f1",
    "6555aa73-c647-4ecf-8a96-b60e315b6b18",
];

const AdminIndicatorWrapper = () => {
    const user = useAppSelector((state: RootState) => state.user);
    const isOverlayOpen = useAppSelector((state) => selectIsOverlayOpen(state, "adminIndicator"));
    
    const isAdmin = ADMIN_USER_IDS.includes(user.id);

    // Only render if user is admin AND the overlay is open
    if (!isAdmin || !isOverlayOpen) return null;

    return <AdminIndicator user={user} />;
};

export default AdminIndicatorWrapper;
