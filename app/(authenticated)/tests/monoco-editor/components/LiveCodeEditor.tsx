'use client';

import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { useMeasure } from "@uidotdev/usehooks";
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const defaultCode = `// You can use console.log here
console.log("Hello World!");

// You can also return values
const sum = 1 + 1;
console.log("1 + 1 =", sum);

// You can use modern JavaScript features
const arr = [1, 2, 3];
const doubled = arr.map(x => x * 2);
console.log("Doubled array:", doubled);

// Return a value to see it in the output
return doubled;`;

const LiveCodeEditor = () => {
    const [ref, { width, height }] = useMeasure();
    const [output, setOutput] = useState<string[]>([]);
    const [editorContent, setEditorContent] = useState(defaultCode);

    const runCode = () => {
        setOutput([]);
        const logs: string[] = [];
        const customConsole = {
            log: (...args: any[]) => {
                logs.push(args.map(arg =>
                    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                ).join(' '));
                setOutput([...logs]);
            }
        };

        try {
            const func = new Function('console', `
        try {
          ${editorContent}
        } catch (error) {
          console.log('Error:', error.message);
        }
      `);
            func(customConsole);
        } catch (error) {
            setOutput([`Error: ${error.message}`]);
        }
    };

    return (
        <div ref={ref} className="flex flex-col w-full h-full">
            <Card className="flex flex-col w-full h-full">
                <div className="p-2 border-b">
                    <Button onClick={runCode}>Run Code</Button>
                </div>

                <div className="grid grid-cols-2 flex-grow">
                    <div className="border-r relative">
                        <Editor
                            height={`${height - 60}px`}
                            width={`${width / 2}px`}
                            defaultLanguage="javascript"
                            value={editorContent}
                            onChange={(value) => setEditorContent(value || '')}
                            theme="vs-dark"
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                lineNumbers: 'on',
                                automaticLayout: true,
                            }}
                        />
                    </div>

                    <ScrollArea className="h-full bg-slate-900 text-white p-4">
                        <h3 className="text-sm font-mono mb-2">Output:</h3>
                        <div className="font-mono text-sm whitespace-pre-wrap">
                            {output.map((line, i) => (
                                <div key={i} className="py-1">
                                    {line}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            </Card>
        </div>
    );
};

export default LiveCodeEditor;