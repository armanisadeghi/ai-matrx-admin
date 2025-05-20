import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppSelector } from "@/lib/redux/hooks";
import { brokerSelectors } from "@/lib/redux/brokerSlice";

interface GroupedItems {
    string?: Array<{ key: string; value: string }>;
    number?: Array<{ key: string; value: number }>;
    boolean?: Array<{ key: string; value: boolean }>;
    object?: Array<{ key: string; value: any }>;
}

const BrokerStateViewer = () => {
    // Get only the brokers part of the state instead of the entire slice
    const brokers = useAppSelector(brokerSelectors.selectAllValues);

    const groupedItems: GroupedItems = Object.entries(brokers).reduce((acc: GroupedItems, [key, value]) => {
        const type = typeof value;
        if (!acc[type]) acc[type] = [];
        acc[type].push({ key, value });
        return acc;
    }, {});

    // Format value based on its type
    const formatValue = (value) => {
        const type = typeof value;

        if (value === null) return <span className="text-gray-400 italic">null</span>;
        if (value === undefined) return <span className="text-gray-400 italic">undefined</span>;

        switch (type) {
            case "boolean":
                return <Badge variant={value ? "success" : "destructive"}>{value.toString()}</Badge>;
            case "number":
                return <span className="font-mono">{value}</span>;
            case "string":
                // Check if it's a URL
                if (value.startsWith("http")) {
                    return (
                        <a
                            href={value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline block max-w-full"
                        >
                            {value}
                        </a>
                    );
                }
                
                // Always show full string, with scrolling if needed
                return (
                    <div className="font-mono text-xs whitespace-pre-wrap break-words">
                        <ScrollArea className="max-h-48 w-full rounded-md bg-slate-100 dark:bg-slate-800 p-2">
                            {value}
                        </ScrollArea>
                    </div>
                );
            case "object":
                if (Array.isArray(value)) {
                    return (
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1" className="border-none">
                                <AccordionTrigger className="py-1 text-xs">Array ({value.length} items)</AccordionTrigger>
                                <AccordionContent>
                                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md font-mono text-xs">
                                        <ScrollArea className="h-full max-h-48 w-full">
                                            {value.map((item, index) => (
                                                <div key={index} className="py-1">
                                                    <span className="text-gray-500 dark:text-gray-400">[{index}]:</span> {formatValue(item)}
                                                </div>
                                            ))}
                                        </ScrollArea>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    );
                }
                return (
                    <ScrollArea className="h-full max-h-48 w-full">
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md">
                            <ObjectViewer data={value} />
                        </div>
                    </ScrollArea>
                );
            default:
                return String(value);
        }
    };

    // Recursive component to display nested objects
    const ObjectViewer = ({ data, level = 0 }) => {
        return (
            <div className={`pl-${level > 0 ? "4" : "0"}`}>
                {Object.entries(data).map(([key, value], index) => (
                    <div key={key} className="py-1">
                        <span className="font-semibold text-xs text-gray-700 dark:text-gray-300">{key}:</span>{" "}
                        {typeof value === "object" && value !== null ? (
                            Array.isArray(value) ? (
                                <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                                    {value.length === 0 ? (
                                        <span className="text-gray-400 italic">Empty array</span>
                                    ) : (
                                        value.map((item, idx) => (
                                            <div key={idx} className="py-1">
                                                <span className="text-gray-500 dark:text-gray-400">[{idx}]:</span>{" "}
                                                {typeof item === "object" && item !== null ? (
                                                    <ObjectViewer data={item} level={level + 1} />
                                                ) : (
                                                    formatValue(item)
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            ) : (
                                <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                                    {Object.keys(value).length === 0 ? (
                                        <span className="text-gray-400 italic">Empty object</span>
                                    ) : (
                                        <ObjectViewer data={value} level={level + 1} />
                                    )}
                                </div>
                            )
                        ) : (
                            formatValue(value)
                        )}
                    </div>
                ))}
            </div>
        );
    };

    // Render section for each type group
    const renderTypeSection = (type, items) => {
        return (
            <Card key={type} className="mb-6">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg capitalize">{type} Values</CardTitle>
                    <CardDescription>
                        {items.length} {type} {items.length === 1 ? "value" : "values"} in brokers
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="multiple" className="w-full">
                        {items.map(({ key, value }) => (
                            <AccordionItem key={key} value={key} className="border-b border-slate-200 dark:border-slate-700">
                                <AccordionTrigger className="hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-md">
                                    <div className="flex justify-between w-full items-center">
                                        <span className="font-mono text-sm">{key}</span>
                                        <Badge variant="outline" className="mr-4">
                                            {Array.isArray(value)
                                                ? `Array[${value.length}]`
                                                : typeof value === "object" && value !== null
                                                ? `Object{${Object.keys(value).length}}`
                                                : typeof value}
                                        </Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-3 py-2 bg-white dark:bg-slate-950 rounded-md mb-1">
                                    {formatValue(value)}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-100">Broker Values</h1>

                {/* Simple values first */}
                {groupedItems.string && renderTypeSection("string", groupedItems.string)}
                {groupedItems.number && renderTypeSection("number", groupedItems.number)}
                {groupedItems.boolean && renderTypeSection("boolean", groupedItems.boolean)}

                {/* Complex objects last */}
                {groupedItems.object && renderTypeSection("object", groupedItems.object)}
            </div>
        </div>
    );
};

export default BrokerStateViewer;
