import React from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Header {
    tag: string;
    text: string;
}

interface Outline {
    [key: string]: any[];
}

interface Overview {
    uuid: string;
    website: string;
    url: string;
    unique_page_name: string;
    page_title: string;
    has_structured_content: boolean;
    table_count: number;
    code_block_count: number;
    list_count: number;
    outline: Outline;
    char_count: number;
}

const HeaderAnalysis = ({ overview }: { overview: Overview }) => {
    const { outline } = overview;

    const headers: Header[] = Object.entries(outline)
        .filter(([key]) => key !== "unassociated")
        .map(([key]) => {
            const [tag, text] = key.split(": ");
            return { tag: tag.toUpperCase(), text };
        });

    const groupedHeaders: { [key: string]: string[] } = headers.reduce((acc, header) => {
        acc[header.tag] = acc[header.tag] || [];
        acc[header.tag].push(header.text);
        return acc;
    }, {});

    const headerStyles: { [key: string]: string } = {
        H1: "text-3xl font-bold tracking-tight",
        H2: "text-2xl font-semibold",
        H3: "text-xl font-medium",
        H4: "text-lg font-medium",
        H6: "text-base font-normal",
    };

    const headerBg: { [key: string]: string } = {
        H1: "bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 text-white",
        H2: "bg-gray-100 dark:bg-gray-800",
        H3: "bg-gray-50 dark:bg-gray-900",
        H4: "bg-transparent",
        H6: "bg-transparent",
    };

    return (
        <Card className="w-full max-w-4xl mx-auto shadow-lg border-none">
            <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    SEO Header Analysis for {overview.unique_page_name}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {Object.keys(groupedHeaders).length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">No headers found in the outline.</p>
                ) : (
                    <Accordion type="single" collapsible className="w-full space-y-2">
                        {Object.entries(groupedHeaders).map(([tag, texts], index) => (
                            <AccordionItem key={tag} value={`item-${index}`} className="border-none">
                                <AccordionTrigger
                                    className={cn(
                                        "rounded-lg px-4 py-3 transition-all duration-200 hover:bg-opacity-90",
                                        headerBg[tag],
                                        tag === "H1" ? "hover:scale-[1.02]" : ""
                                    )}
                                >
                                    <span
                                        className={cn(
                                            headerStyles[tag],
                                            tag === "H1" ? "drop-shadow-md" : "text-gray-800 dark:text-gray-200"
                                        )}
                                    >
                                        {tag}: {texts.length} Found
                                    </span>
                                </AccordionTrigger>
                                <AccordionContent className="mt-2 space-y-3 px-4">
                                    {texts.map((text, idx) => (
                                        <div
                                            key={idx}
                                            className={cn(
                                                "p-3 rounded-md bg-white dark:bg-gray-950 shadow-sm border border-gray-200 dark:border-gray-800",
                                                "text-gray-700 dark:text-gray-300",
                                                "hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                                            )}
                                        >
                                            <span className={headerStyles[tag]}>{text}</span>
                                        </div>
                                    ))}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </CardContent>
        </Card>
    );
};

export default HeaderAnalysis;
