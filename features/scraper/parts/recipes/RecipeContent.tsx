"use client";
import React, { useEffect, useState } from "react";
import { convertOrganizedDataToString } from "../../utils/scraper-utils";
import MarkdownRenderer from "@/components/mardown-display/MarkdownRenderer";

import { SocketHook } from "@/lib/redux/socket/hooks/useSocket";
interface RecipeContentProps {
    socketHook: SocketHook;
}

const RecipeContent = ({ socketHook }: RecipeContentProps) => {
    const { streamingResponse } = socketHook;

    return (
        <div className="mb-4">
            <MarkdownRenderer content={streamingResponse} type="message" fontSize={18} role="assistant" className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border-2 border-gray-300 dark:border-gray-700 shadow-xl" />
        </div>
    );
};

export default RecipeContent;
