"use client";

import { ReactNode, useState } from "react";
import { AskAi } from "@/app/dashboard/code-editor/components";

type FooterProps = {
    executionResult: ReactNode;
};

export const Footer: React.FC<FooterProps> = ({ executionResult }) => {
    const [activeTab, setActiveTab] = useState("footer-ask-ai");

    const tabData = [
        { id: "footer-ask-ai", title: "Ask AI", content: <AskAi /> },
        { id: "footer-output", title: "Output", content: <>{executionResult}</> },
    ];

    return (
        <div className="w-full mx-auto mt-2 min-h-48 bg-neutral-900">
            {/* Tabs navigation */}
            <div className="flex border-b-2 border-neutral-700 mb-2.5">
                {tabData.map(({ id, title }) => (
                    <button
                        key={id}
                        className={`px-4 py-2 font-normal text-sm transition-colors rounded-t ${
                            activeTab === id
                                ? "border-b-2 border-neutral-100 text-neutral-100 font-semibold"
                                : "text-neutral-100 hover:text-neutral-100 hover:bg-neutral-700"
                        }`}
                        onClick={() => setActiveTab(id)}
                    >
                        {title}
                    </button>
                ))}
            </div>

            {/* Tabs content */}
            <div className="rounded">
                <p className="text-sm">{tabData.find((tab) => tab.id === activeTab)?.content}</p>
            </div>
        </div>
    );
};
