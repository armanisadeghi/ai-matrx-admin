// components/ui/JsonViewer.tsx

import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface JsonViewerProps extends React.HTMLAttributes<HTMLPreElement> {
    data: object;
}

export const JsonViewer: React.FC<JsonViewerProps> = (
    {
                                                          data,
                                                          className,
                                                          ...props
                                                      }) => {
    return (
        <pre
            className={cn(
                "bg-muted p-4 rounded-md overflow-auto max-h-[400px] text-sm",
                "whitespace-pre-wrap break-words",
                className
            )}
            {...props}
        >
      {JSON.stringify(data, null, 2)}
    </pre>
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
