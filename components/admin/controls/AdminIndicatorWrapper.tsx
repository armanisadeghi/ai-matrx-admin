// components/AdminIndicatorWrapper.tsx
"use client";

import React from "react";
import AdminIndicator from "./AdminIndicator";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsOverlayOpen } from "@/lib/redux/slices/overlaySlice";
import { useUser } from "@/lib/hooks/useUser";


const AdminIndicatorWrapper = () => {
    const { isAdmin, user } = useUser();
    const isOverlayOpen = useAppSelector((state) => selectIsOverlayOpen(state, "adminIndicator"));

    // Only render if user is admin AND the overlay is open
    if (!isAdmin || !isOverlayOpen) return null;

    return <AdminIndicator user={user} />;
};

export default AdminIndicatorWrapper;
