import { useState } from "react";
import { useEntityData, useEntityTools } from "@/lib/redux/entity/hooks/coreHooks";
import { useEffect } from "react";
import { Applet } from "@/components/applet/apps/AppletCard";
import { useGetOrFetchRecord } from "@/app/entities/hooks/records/useGetOrFetch";


export function useRunApps(appletId: string) {
    const {actions, selectors} = useEntityData("applet");

    const appletRecord = useGetOrFetchRecord({entityName: "applet", simpleId: appletId});
    


    useEffect(() => {
        setApplet(appletRecord);
    }, [appletRecord]);

    return {
        applet,
        actions,
        selectors,
    };
}
