import { useState, useEffect } from "react";
import { setBrokerMap } from "@/lib/redux/app-runner/slices/brokerSlice";
import { useAppDispatch } from "@/lib/redux/hooks";
import { v4 as uuidv4 } from "uuid";


export default function useTempBrokerMapping(fieldId: string) {
    const [stableAppletId, setStableAppletId] = useState<string>(null);
    const [stableBrokerId, setStableBrokerId] = useState<string>(null);

    useEffect(() => {
        setStableAppletId(uuidv4());
        setStableBrokerId(uuidv4());
    }, [fieldId]);

    const dispatch = useAppDispatch();

    useEffect(() => {
        if (fieldId && stableAppletId && stableBrokerId) {
            dispatch(
                setBrokerMap([
                    {
                        source: "applet",
                        sourceId: stableAppletId,
                        itemId: fieldId,
                        brokerId: stableBrokerId,
                    },
                ])
            );
        }
    }, [fieldId, stableAppletId, stableBrokerId, dispatch]);

    return { stableAppletId, stableBrokerId };
}
