import React, { useRef, useState, useEffect } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus, vs } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { cn } from "@/styles/themes/utils";
import SmallCodeEditor from "./SmallCodeEditor";
import CodeBlockHeader from "./CodeBlockHeader";
import { EditButton } from "./CodeBlockHeader";
import { useTheme } from "@/styles/themes/ThemeProvider";
import StickyButtons from "./StickyButtons";
import { useIsMobile } from "@/hooks/use-mobile";

interface CodeBlockProps {
    code: string;
    language: string;
    fontSize?: number;
    showLineNumbers?: boolean;
    wrapLines?: boolean;
    className?: string;
    onCodeChange?: (newCode: string) => void;
    inline?: boolean;
    isStreamActive?: boolean;
}

const CodeBlock: React.FC<CodeBlockProps> = ({
    code: initialCode,
    language,
    fontSize = 16,
    showLineNumbers = false,
    wrapLines = false,
    className,
    onCodeChange,
    inline = false,
    isStreamActive = false,
}) => {
    const [code, setCode] = useState("");
    const [isCopied, setIsCopied] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [lineNumbers, setLineNumbers] = useState(showLineNumbers);
    const [showWrapLines, setShowWrapLines] = useState(wrapLines);
    const [isTopInView, setIsTopInView] = useState(false);
    const [isBottomInView, setIsBottomInView] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const topRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const showStickyButtons = isBottomInView && !isTopInView && !isEditing;
    const { mode } = useTheme();
    const isMobile = useIsMobile();

    useEffect(() => {
        setCode(initialCode);
    }, [initialCode]);

    useEffect(() => {
        const observerOptions = {
            root: null,
            rootMargin: "0px",
            threshold: 0,
        };
        const topObserver = new IntersectionObserver(([entry]) => setIsTopInView(entry.isIntersecting), observerOptions);
        const bottomObserver = new IntersectionObserver(([entry]) => setIsBottomInView(entry.isIntersecting), observerOptions);

        if (topRef.current) topObserver.observe(topRef.current);
        if (bottomRef.current) bottomObserver.observe(bottomRef.current);

        return () => {
            if (topRef.current) topObserver.unobserve(topRef.current);
            if (bottomRef.current) bottomObserver.unobserve(bottomRef.current);
            topObserver.disconnect();
            bottomObserver.disconnect();
        };
    }, [isFullScreen]);

    // Handle outside click to close full screen
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Check if click is outside the component
            if (isFullScreen && containerRef.current && !containerRef.current.contains(event.target as Node)) {
                // Restore scrolling
                document.body.style.overflow = "auto";

                // Small delay to allow animation to complete before changing state
                setTimeout(() => {
                    setIsFullScreen(false);
                    setIsEditing(false);
                    setIsCollapsed(false);
                }, 50);
            }
        };

        if (isFullScreen) {
            document.addEventListener("mousedown", handleClickOutside);
            // Prevent background scrolling when fullscreen is active
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            // Make sure scroll is restored when component unmounts
            document.body.style.overflow = "auto";
        };
    }, [isFullScreen]);

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(code);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        const blob = new Blob([code], { type: "text/plain" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `code.${language}`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const toggleLineNumbers = (e: React.MouseEvent) => {
        e.stopPropagation();
        setLineNumbers(!lineNumbers);
    };

    const toggleWrapLines = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowWrapLines(!showWrapLines);
    };

    const toggleFullScreen = (e: React.MouseEvent) => {
        e.stopPropagation();

        // Add a small delay when exiting fullscreen to allow animation to complete
        if (isFullScreen) {
            // First start the transition
            document.body.style.overflow = "auto"; // Restore scrolling

            // Small delay to allow animation to complete before changing state
            setTimeout(() => {
                setIsFullScreen(false);
                setIsEditing(false);
                setIsCollapsed(false);
            }, 150);
        } else {
            // Entering fullscreen
            document.body.style.overflow = "hidden"; // Prevent background scrolling
            setIsFullScreen(true);
            if (isCollapsed) setIsCollapsed(false);
        }
    };

    const toggleCollapse = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (isEditing) return;
        setIsCollapsed(!isCollapsed);
        if (isFullScreen) setIsFullScreen(false);
    };

    const toggleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(!isEditing);
        if (!isEditing) {
            setIsFullScreen(true);
            setIsCollapsed(false);
        } else {
            setIsFullScreen(false);
            setIsEditing(false);
            setIsCollapsed(false);
        }
    };

    const handleCodeChange = (newCode: string | undefined) => {
        if (newCode) {
            setCode(newCode);
            onCodeChange?.(newCode);
        }
    };

    return (
        <div
            ref={containerRef}
            className={cn(
                "w-full my-4 rounded-t-xl rounded-b-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 transition-all duration-300 ease-in-out",
                isFullScreen &&
                    "fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[95%] h-[90%] z-50 bg-white dark:bg-neutral-900 flex flex-col shadow-2xl",
                className
            )}
            style={{
                opacity: isFullScreen ? 1 : undefined,
                transform: isFullScreen ? "translate(-50%, -50%) scale(1)" : undefined,
                transition: "opacity 300ms ease-in-out, transform 300ms ease-in-out, width 300ms ease-in-out, height 300ms ease-in-out",
            }}
        >
            <CodeBlockHeader
                language={language}
                linesCount={code.split("\n").length}
                isEditing={isEditing}
                isFullScreen={isFullScreen}
                isCollapsed={isCollapsed}
                code={code}
                handleCopy={handleCopy}
                handleDownload={handleDownload}
                toggleEdit={toggleEdit}
                toggleFullScreen={toggleFullScreen}
                toggleCollapse={toggleCollapse}
                isCopied={isCopied}
                isMobile={isMobile}
            />
            {showStickyButtons && (
                <StickyButtons
                    linesCount={code.split("\n").length}
                    isCollapsed={isCollapsed}
                    isCopied={isCopied}
                    handleCopy={handleCopy}
                    toggleCollapse={toggleCollapse}
                    isMobile={isMobile}
                />
            )}
            <div className={cn("relative", isFullScreen && "flex-1 overflow-hidden")}>
                <EditButton isEditing={isEditing} toggleEdit={toggleEdit} />
                {isEditing ? (
                    <div className={cn("w-full", isFullScreen ? "h-[calc(100vh-15rem)]" : "min-h-[200px]")}>
                        <SmallCodeEditor language={language} initialCode={code} onChange={handleCodeChange} mode={mode} />
                    </div>
                ) : (
                    <div className={cn("relative", isFullScreen && "h-full")}>
                        <div ref={topRef} style={{ height: "1px" }} />
                        <div
                            ref={bottomRef}
                            className={cn(
                                "transition-all duration-300 ease-in-out",
                                isCollapsed ? "max-h-[150px]" : "max-h-none",
                                isFullScreen ? "h-full overflow-auto" : "overflow-hidden"
                            )}
                        >
                            <SyntaxHighlighter
                                language={language}
                                style={mode === "dark" ? vscDarkPlus : vs}
                                showLineNumbers={lineNumbers}
                                wrapLines={showWrapLines}
                                wrapLongLines={showWrapLines}
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
                        {isCollapsed && (
                            <div
                                className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-neutral-900 to-transparent opacity-80 cursor-pointer"
                                onClick={toggleCollapse}
                            >
                                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-neutral-400 text-sm">
                                    Click to expand {code.split("\n").length - 3} more lines
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CodeBlock;
