"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { brokerActions } from "@/lib/redux/brokerSlice";
import { UserData } from "@/utils/userDataMapper";
import { useSetGlobalBasics } from "@/hooks/brokers/useSetGlobalBasics";

interface GlobalBrokersInitializerProps {
    user: UserData;
}

export const ADMIN_USER_IDS = [
    "4cf62e4e-2679-484f-b652-034e697418df",
    "8f7f17ba-935b-4967-8105-7c6b554f41f1",
    "6555aa73-c647-4ecf-8a96-b60e315b6b18",
  ];
  


export function GlobalBrokersInitializer({ user }: GlobalBrokersInitializerProps) {
    const dispatch = useAppDispatch();

    useSetGlobalBasics();

    useEffect(() => {
        if (!user?.id) return;

        dispatch(
            brokerActions.setValue({
                brokerId: "GLOBAL_USER_OBJECT",
                value: user,
            })
        );

        dispatch(
            brokerActions.setValue({
                brokerId: "GLOBAL_USER_ID",
                value: user.id,
            })
        );

        const userName = user.userMetadata?.fullName || user.userMetadata?.name || user.userMetadata?.preferredUsername || user.email;

        dispatch(
            brokerActions.setValue({
                brokerId: "GLOBAL_USER_NAME",
                value: userName,
            })
        );

        const profileImage = user.userMetadata?.avatarUrl || user.userMetadata?.picture || null;

        dispatch(
            brokerActions.setValue({
                brokerId: "GLOBAL_USER_PROFILE_IMAGE",
                value: profileImage,
            })
        );

        const isAdmin = ADMIN_USER_IDS.includes(user.id);

        dispatch(
            brokerActions.setValue({
                brokerId: "GLOBAL_USER_IS_ADMIN",
                value: isAdmin,
            })
        );
        
    }, [dispatch, user]);

    return null;
}
