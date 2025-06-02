"use client";

import { createContext } from "react";

// Context for broker highlighting across all components
export const BrokerHighlightContext = createContext<{
    highlightedBroker: string | null;
    setHighlightedBroker: (brokerId: string | null) => void;
}>({
    highlightedBroker: null,
    setHighlightedBroker: () => {},
});

