'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { Copy, Check, Code as CodeIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCodeHighlight, LanguageKey, useShiki } from '@/providers/ShikiProvider';

interface CodeBlockProps {
    code: string;
    language: LanguageKey;
    inline?: boolean;
    className?: string;
}

const CodeBlock = ({ code, language, inline, className }: CodeBlockProps) => {
    const shikiContext = useShiki();

    // Debug logs for initial props and context
    console.log('CodeBlock Render:', {
        languageProp: language,
        inlineProp: inline,
        codeLength: code.length,
        supportedLanguages: Array.from(shikiContext.supportedLanguages),
        hasHighlighter: !!shikiContext.highlighter,
        contextLoading: shikiContext.loading,
        contextError: shikiContext.error
    });

    const { html, isLoading, error } = useCodeHighlight(code, language);
    const [copied, setCopied] = React.useState(false);
    const [isExpanded, setIsExpanded] = React.useState(false);

    // Debug log for highlighting result
    React.useEffect(() => {
        console.log('Highlighting Result:', {
            hasHtml: !!html,
            htmlLength: html.length,
            isLoading,
            error,
            language
        });
    }, [html, isLoading, error, language]);

    // Add language loading effect
    React.useEffect(() => {
        if (language && !shikiContext.supportedLanguages.has(language)) {
            console.log('Attempting to load language:', language);
            shikiContext.loadLanguage(language)
                .then(() => console.log('Successfully loaded language:', language))
                .catch(err => console.error('Failed to load language:', language, err));
        }
    }, [language, shikiContext]);

    const copyCode = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (inline) {
        return (
            <code className="px-1.5 py-0.5 rounded-md bg-muted font-mono text-sm">
                {code}
            </code>
        );
    }

    if (isLoading) {
        console.log('Rendering loading state');
        return <div className="animate-pulse bg-muted h-24 rounded-lg" />;
    }

    if (error) {
        console.log('Rendering error state:', error);
        return (
            <pre className="p-4 bg-destructive/10 text-destructive rounded-lg">
                <code>{code}</code>
            </pre>
        );
    }

    return (
        <div className="not-prose relative group my-4 rounded-lg overflow-hidden">
            <div className="absolute right-2 top-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={copyCode}
                >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                {code.split('\n').length > 15 && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <CodeIcon className="h-4 w-4" />
                    </Button>
                )}
            </div>
            <div
                className={cn(
                    "relative rounded-lg overflow-hidden",
                    isExpanded ? "max-h-none" : "max-h-[32rem]"
                )}
            >
                <div
                    className={cn(
                        "shiki-wrapper",
                        !isExpanded && code.split('\n').length > 15 && 'mask-bottom'
                    )}
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            </div>
        </div>
    );
};

export default CodeBlock;
