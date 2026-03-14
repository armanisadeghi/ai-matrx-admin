"use client";
import React, { createContext, useContext } from "react";

/**
 * Controls rendering behaviour for the block pipeline.
 *
 * strictServerData — when true, structured blocks (quiz, presentation, table, etc.)
 * will NOT fall back to client-side content parsing when block.serverData is null.
 * Instead they render a visible error panel so you immediately know Python failed to
 * populate the `data` field.
 *
 * Leave false (default) for production — the existing graceful fallback runs.
 * Set to true in any debug/testing UI to catch Python pipeline failures early.
 */
export interface BlockRenderingConfig {
    strictServerData: boolean;
}

const defaultConfig: BlockRenderingConfig = {
    strictServerData: false,
};

export const BlockRenderingContext = createContext<BlockRenderingConfig>(defaultConfig);

export const useBlockRenderingConfig = () => useContext(BlockRenderingContext);

interface BlockRenderingProviderProps {
    children: React.ReactNode;
    strictServerData?: boolean;
}

export const BlockRenderingProvider: React.FC<BlockRenderingProviderProps> = ({
    children,
    strictServerData = false,
}) => (
    <BlockRenderingContext.Provider value={{ strictServerData }}>
        {children}
    </BlockRenderingContext.Provider>
);
