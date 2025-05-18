"use client";
import { useEffect, useState } from "react";
import { useAppDispatch } from "@/lib/redux";
import { brokerActions } from "@/lib/redux/brokerSlice";
import { SLACK_BROKER_IDS } from "./components/BrokerSlackClient";
import { LoadingSpinner } from "@/components/ui/spinner";

export default function SlackBrokersLayout({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();
    const [initialized, setInitialized] = useState(false);
    
    useEffect(() => {
        const brokerMappings = Object.entries(SLACK_BROKER_IDS).map(([key, idArgs]) => {
            const brokerId = `slack-${idArgs.source}-${idArgs.itemId}-${Date.now()}`;
            return {
                source: idArgs.source,
                sourceId: "slack-integration",
                itemId: idArgs.itemId,
                brokerId: brokerId,
            };
        });
        
        dispatch(brokerActions.addOrUpdateRegisterEntries(brokerMappings));
        
        setInitialized(true);
    }, [dispatch]);
    
    if (!initialized) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 transition-colors">
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-blue-600 dark:text-blue-400 text-sm animate-pulse">Loading Slack integration...</p>
            </div>
        );
    }
    
    return (
        <div className="w-full h-full bg-slate-100 dark:bg-slate-900">
            {children}
        </div>
    );
}