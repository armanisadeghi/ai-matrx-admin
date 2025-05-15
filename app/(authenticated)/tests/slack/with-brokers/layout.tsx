"use client";
import { useEffect, useState } from "react";
import { useAppDispatch } from "@/lib/redux";
import { brokerConceptActions } from "@/lib/redux/brokerSlice";
import { SLACK_BROKER_IDS } from "./components/BrokerSlackClient";
import { LoadingSpinner } from "@/components/ui/spinner";

export default function SlackBrokersLayout({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();
    const [initialized, setInitialized] = useState(false);
    
    // Register all the broker mappings
    useEffect(() => {
        // Create broker mappings for all the Slack brokers
        const brokerMappings = Object.entries(SLACK_BROKER_IDS).map(([key, idArgs]) => {
            // Generate a unique brokerId for each mapping
            // In a real app, these would come from the database
            const brokerId = `slack-${idArgs.source}-${idArgs.itemId}-${Date.now()}`;
            return {
                source: idArgs.source,
                sourceId: "slack-integration", // Could be user ID in a real app
                itemId: idArgs.itemId,
                brokerId: brokerId,
            };
        });
        
        // Register all the broker mappings
        dispatch(brokerConceptActions.setMap(brokerMappings));
        
        // Mark as initialized after broker registration
        setInitialized(true);
        
        // Cleanup on unmount
        return () => {
            // Unregister brokers on unmount
            brokerMappings.forEach((mapping) => {
                dispatch(
                    brokerConceptActions.removeMapEntry({
                        source: mapping.source,
                        itemId: mapping.itemId,
                    })
                );
            });
        };
    }, [dispatch]);
    
    // Show loading state until brokers are ready
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