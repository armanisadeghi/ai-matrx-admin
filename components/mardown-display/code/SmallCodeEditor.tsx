"use client";
import { useState } from "react";
import { useMonaco } from "@monaco-editor/react";
import Editor from "@monaco-editor/react";
import { useMeasure } from "@uidotdev/usehooks";
import { Button } from "@/components/ui/button";
import { useMonacoTheme } from "@/components/code-editor/useMonacoTheme";

interface CodeEditorProps {
    language?: string;
    initialCode?: string;
    onChange?: (value: string | undefined) => void;
    runCode?: () => void;
    mode?: "dark" | "light";
}

const SmallCodeEditor = ({ language = "javascript", initialCode = "// Start coding here...", onChange, runCode, mode = "dark" }: CodeEditorProps) => {
    const [ref, { width, height }] = useMeasure();
    const isDark = useMonacoTheme();
    const [output, setOutput] = useState<string>("");

    return (
        <div ref={ref} className="flex flex-col w-full h-full">
            {/* Main editor area */}
            <div className="flex-grow relative">
                <Editor
                    height={height ? `${height - 40}px` : "300px"} // Subtract button height or set a fallback
                    width="100%"
                    defaultLanguage={language}
                    language={language}
                    defaultValue={initialCode}
                    theme={isDark ? "customDark" : "customLight"}
                    onChange={onChange}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                    }}
                />
            </div>

            <Button 
                variant="default" 
                className="w-full mt-2"
                onClick={runCode}
            >
                Run Code
            </Button>
        </div>
    );
};

export default SmallCodeEditor;