// components/ui/JsonViewer.tsx

import React, {useState} from 'react';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';
import {motion, AnimatePresence} from 'framer-motion';
import {Copy, ChevronDown, ChevronRight} from 'lucide-react';

interface JsonViewerProps extends React.HTMLAttributes<HTMLDivElement> {
    data: object;
    initialExpanded?: boolean;
}

const JsonViewerItem: React.FC<{ keyName: string; value: any; depth: number; initialExpanded: boolean }> = (
    {
        keyName,
        value,
        depth,
        initialExpanded
    }) => {
    const [isExpanded, setIsExpanded] = useState(initialExpanded);
    const isObject = typeof value === 'object' && value !== null;

    const toggleExpand = () => setIsExpanded(!isExpanded);

    return (
        <div className={cn("ml-4", depth === 0 && "ml-0")}>
            <div className="flex items-center">
                {isObject && (
                    <Button variant="ghost" size="sm" className="p-0 h-auto" onClick={toggleExpand}>
                        {isExpanded ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
                    </Button>
                )}
                <span className="font-semibold">{keyName}: </span>
                {!isObject && <span
                    className={cn("ml-2", typeof value === 'string' && "text-green-500")}>{JSON.stringify(value)}</span>}
            </div>
            {isObject && (
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{opacity: 0, height: 0}}
                            animate={{opacity: 1, height: 'auto'}}
                            exit={{opacity: 0, height: 0}}
                            transition={{duration: 0.2}}
                        >
                            {Object.entries(value).map(([k, v]) => (
                                <JsonViewerItem key={k} keyName={k} value={v} depth={depth + 1}
                                                initialExpanded={initialExpanded}/>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            )}
        </div>
    );
};

export const JsonViewer: React.FC<JsonViewerProps> = (
    {
        data,
        className,
        initialExpanded = false,
        ...props
    }) => {
    const [isCopied, setIsCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(JSON.stringify(data, null, 2));
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div
            className={cn("relative bg-muted p-4 rounded-md overflow-auto max-h-[400px] text-sm", className)} {...props}>
            <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={copyToClipboard}
            >
                <Copy className="h-4 w-4 mr-2"/>
                {isCopied ? 'Copied!' : 'Copy'}
            </Button>
            {Object.entries(data).map(([key, value]) => (
                <JsonViewerItem key={key} keyName={key} value={value} depth={0} initialExpanded={initialExpanded}/>
            ))}
        </div>
    );
};

interface FullJsonViewerProps extends Omit<JsonViewerProps, 'className'> {
    title?: string;
    className?: string;
}

export const FullJsonViewer: React.FC<FullJsonViewerProps> = (
    {
        data,
        title = "JSON Data",
        className,
        ...props
    }) => {
    return (
        <Card className={cn("p-4", className)}>
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <JsonViewer data={data} {...props} />
        </Card>
    );
};

export default FullJsonViewer;
