import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppSelector } from "@/lib/redux/hooks";
import { brokerSelectors } from "@/lib/redux/brokerSlice";

const BrokerMapViewer = () => {
    const brokerMap = useAppSelector(brokerSelectors.selectMap);
    
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
                // Check if it's a long string
                if (value.length > 100) {
                    return (
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1" className="border-none">
                                <AccordionTrigger className="py-1 text-xs">Show content ({value.length} chars)</AccordionTrigger>
                                <AccordionContent>
                                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md font-mono text-xs whitespace-pre-wrap max-h-48 overflow-auto">
                                        {value}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    );
                }
                // Check if it's a URL
                if (value.startsWith("http")) {
                    return (
                        <a
                            href={value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline truncate block max-w-md"
                        >
                            {value}
                        </a>
                    );
                }
                return <span className="font-mono truncate block max-w-md">{value}</span>;
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
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1" className="border-none">
                            <AccordionTrigger className="py-1 text-xs">Object ({Object.keys(value).length} properties)</AccordionTrigger>
                            <AccordionContent>
                                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md">
                                    <ScrollArea className="h-full max-h-48 w-full">
                                        <ObjectViewer data={value} />
                                    </ScrollArea>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
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
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value={`item-${index}`} className="border-none">
                                    <AccordionTrigger className="py-1 text-xs">
                                        {Array.isArray(value)
                                            ? `Array (${value.length} items)`
                                            : `Object (${Object.keys(value).length} properties)`}
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                                            {Array.isArray(value) ? (
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
                                            ) : (
                                                <ObjectViewer data={value} level={level + 1} />
                                            )}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        ) : (
                            formatValue(value)
                        )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-100">Broker Map Viewer</h1>
                
                <Card className="mb-6">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Broker Map Entries</CardTitle>
                        <CardDescription>
                            {Object.keys(brokerMap).length} entries in broker map
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="multiple" className="w-full">
                            {Object.entries(brokerMap).map(([key, value]) => (
                                <AccordionItem key={key} value={key} className="border-b border-slate-200 dark:border-slate-700">
                                    <AccordionTrigger className="hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-md">
                                        <div className="flex justify-between w-full items-center">
                                            <span className="font-mono text-sm">{key}</span>
                                            <Badge variant="outline" className="mr-4">
                                                {typeof value === "object" && value !== null
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
            </div>
        </div>
    );
};

export default BrokerMapViewer; 