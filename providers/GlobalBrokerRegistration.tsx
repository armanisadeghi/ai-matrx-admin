"use client";

import { ReactNode, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux";
import { brokerActions } from "@/lib/redux/brokerSlice";

// Define the system-wide broker entries that should be registered
const SYSTEM_BROKERS = [
    {
        source: "system",
        sourceId: "global",
        mappedItemId: "user",
        brokerId: "GLOBAL_USER_OBJECT",
    },
    {
        source: "system",
        sourceId: "global",
        mappedItemId: "userId",
        brokerId: "GLOBAL_USER_ID",
    },
    {
        source: "system",
        sourceId: "global",
        mappedItemId: "userName",
        brokerId: "GLOBAL_USER_NAME",
    },
    {
        source: "system",
        sourceId: "global",
        mappedItemId: "userProfileImage",
        brokerId: "GLOBAL_USER_PROFILE_IMAGE",
    },
];

interface GlobalBrokerRegistrationProps {
    children: ReactNode;
}

export function GlobalBrokerRegistration({ children }: GlobalBrokerRegistrationProps) {
    const dispatch = useAppDispatch();

    // Register all system-wide brokers on initial mount
    useEffect(() => {
        // Only register the broker mappings - no values are set here
        dispatch(brokerActions.addOrUpdateRegisterEntries(SYSTEM_BROKERS));
        console.log("System-wide broker mappings registered");
    }, [dispatch]);


    // IMPORTANT: Brokers can now be accessed via EITHER the brokerId or the idArgs (source, id)
    // If you have the brokerId, it would be very stupid to attempt to access it via idArgs.
    // The purpose of idArgs is to allow different parts of the application to dynamically declare themselves as a source for a brokerId and have other parts access it without having to know what set it.

    return <>{children}</>;
}
