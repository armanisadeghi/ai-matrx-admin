import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus, vs } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { cn } from "@/styles/themes/utils";
import LanguageDisplay from "@/components/mardown-display/LanguageDisplay";
import { useTheme } from '@/styles/themes/ThemeProvider';

interface StreamingCodeProps {
    code: string;
    language: string;
    fontSize?: number;
    className?: string;
}

const StreamingCode: React.FC<StreamingCodeProps> = ({
    code,
    language,
    fontSize = 16,
    className,
}) => {
    const { mode } = useTheme();


    return (
        <div
            className={cn(
                "my-4 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 transition-all duration-200",
                className
            )}
        >
            <div className="relative">
                <div
                    className={cn(
                        "flex items-center justify-between px-4 py-2 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700",
                    )}
                >
                    <div className="flex items-center space-x-4">
                        <div className="flex space-x-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <LanguageDisplay language={language} />
                        </div>
                    </div>
                </div>

                <div className="relative">
                    <div className={cn("overflow-hidden transition-all duration-200 max-h-none")}>
                        <SyntaxHighlighter
                            language={language}
                            style={mode === 'dark' ? vscDarkPlus : vs}
                            showLineNumbers={false}
                            wrapLines={true}
                            wrapLongLines={true}
                            customStyle={{
                                paddingTop: "1rem",
                                paddingRight: "1rem",
                                paddingBottom: "1rem",
                                paddingLeft: "1rem",
                                fontSize: `${fontSize}px`,
                                height: "auto",
                                minHeight: "auto",
                            }}
                        >
                            {code}
                        </SyntaxHighlighter>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StreamingCode;
