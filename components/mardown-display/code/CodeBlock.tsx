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
import { HTMLPageService } from "@/features/html-pages/services/htmlPageService";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/selectors/userSelectors";
import { Globe, Loader2 } from "lucide-react";

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
    wrapLines = true,
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
    const [isViewingHTML, setIsViewingHTML] = useState(false);
    const [htmlPageUrl, setHtmlPageUrl] = useState<string>("");
    const [isCreatingPage, setIsCreatingPage] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const topRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const showStickyButtons = isBottomInView && !isTopInView && !isEditing;
    const { mode } = useTheme();
    const isMobile = useIsMobile();
    const user = useAppSelector(selectUser);

    // Function to detect if code is a complete HTML document
    const isCompleteHTMLDocument = (htmlCode: string): boolean => {
        if (!htmlCode || language !== 'html') return false;
        
        const trimmedCode = htmlCode.trim();
        const hasDoctype = /^\s*<!DOCTYPE\s+html/i.test(trimmedCode);
        const hasHtmlTag = /<html[^>]*>/i.test(trimmedCode) && /<\/html>/i.test(trimmedCode);
        const hasHead = /<head[^>]*>/i.test(trimmedCode) && /<\/head>/i.test(trimmedCode);
        const hasBody = /<body[^>]*>/i.test(trimmedCode) && /<\/body>/i.test(trimmedCode);
        
        return hasDoctype && hasHtmlTag && hasHead && hasBody;
    };

    // Function to handle HTML document viewing
    const handleViewHTML = async () => {
        if (!user?.id) {
            alert('You must be logged in to view HTML pages');
            return;
        }

        if (isViewingHTML && htmlPageUrl) {
            // If already viewing, just switch back to code
            setIsViewingHTML(false);
            return;
        }

        setIsCreatingPage(true);
        try {
            const result = await HTMLPageService.createPage(
                code,
                'Code Preview',
                'Generated from code block',
                user.id
            );
            
            setHtmlPageUrl(result.url);
            setIsViewingHTML(true);
        } catch (error) {
            console.error('Failed to create HTML page:', error);
            alert(`Failed to create HTML page: ${error.message}`);
        } finally {
            setIsCreatingPage(false);
        }
    };

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
                isCompleteHTML={isCompleteHTMLDocument(code)}
                handleViewHTML={handleViewHTML}
                isViewingHTML={isViewingHTML}
                isCreatingPage={isCreatingPage}
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
                ) : isViewingHTML && htmlPageUrl ? (
                    // HTML Page View with flip animation
                    <div 
                        className={cn("relative", isFullScreen && "h-full")}
                        style={{ perspective: '1000px' }}
                    >
                        <div
                            className="transition-transform duration-700 ease-in-out transform-gpu"
                            style={{
                                transformStyle: 'preserve-3d',
                                transform: 'rotateY(0deg)' // Show HTML normally after flip
                            }}
                        >
                            <div>
                                <div ref={topRef} style={{ height: "1px" }} />
                                <div
                                    ref={bottomRef}
                                    className={cn(
                                        "border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden",
                                        isFullScreen ? "h-full" : "h-auto"
                                    )}
                                    style={{ 
                                        minHeight: isFullScreen ? '100%' : '600px',
                                        height: isFullScreen ? '100%' : 'auto'
                                    }}
                                >
                                    <iframe
                                        src={htmlPageUrl}
                                        className="w-full"
                                        title="HTML Preview"
                                        sandbox="allow-scripts allow-same-origin allow-forms"
                                        style={{ 
                                            border: 'none',
                                            height: isFullScreen ? '100%' : '600px',
                                            minHeight: '600px'
                                        }}
                                        onLoad={(e) => {
                                            console.log('Iframe loaded successfully for URL:', htmlPageUrl);
                                            if (!isFullScreen) {
                                                // Get the iframe element
                                                const iframe = e.target as HTMLIFrameElement;
                                                
                                                // Set a timeout to allow content to fully load
                                        setTimeout(() => {
                                            try {
                                                // Try to access the iframe document
                                                const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                                                if (iframeDoc) {
                                                    // Get the full content height including all elements
                                                    const body = iframeDoc.body;
                                                    const html = iframeDoc.documentElement;
                                                    
                                                    const contentHeight = Math.max(
                                                        body?.scrollHeight || 0,
                                                        body?.offsetHeight || 0,
                                                        body?.clientHeight || 0,
                                                        html?.scrollHeight || 0,
                                                        html?.offsetHeight || 0,
                                                        html?.clientHeight || 0,
                                                        600 // minimum height
                                                    );
                                                    
                                                    // Add extra padding to ensure no scrolling
                                                    const finalHeight = contentHeight + 50;
                                                    
                                                    console.log('Content measurements:', {
                                                        bodyScrollHeight: body?.scrollHeight,
                                                        bodyOffsetHeight: body?.offsetHeight,
                                                        htmlScrollHeight: html?.scrollHeight,
                                                        htmlOffsetHeight: html?.offsetHeight,
                                                        finalHeight
                                                    });
                                                    
                                                    // Set iframe height to match content + padding
                                                    iframe.style.height = `${finalHeight}px`;
                                                    iframe.style.minHeight = `${finalHeight}px`;
                                                    iframe.style.overflow = 'hidden'; // Prevent any scrolling
                                                    
                                                    // Also update the container
                                                    const container = iframe.parentElement;
                                                    if (container) {
                                                        container.style.height = `${finalHeight}px`;
                                                        container.style.minHeight = `${finalHeight}px`;
                                                    }
                                                    
                                                    // Try again after a longer delay in case content is still loading
                                                    setTimeout(() => {
                                                        const newContentHeight = Math.max(
                                                            body?.scrollHeight || 0,
                                                            html?.scrollHeight || 0,
                                                            600
                                                        );
                                                        const newFinalHeight = newContentHeight + 50;
                                                        
                                                        if (newFinalHeight > finalHeight) {
                                                            console.log('Adjusting height after delay:', newFinalHeight);
                                                            iframe.style.height = `${newFinalHeight}px`;
                                                            iframe.style.minHeight = `${newFinalHeight}px`;
                                                            if (container) {
                                                                container.style.height = `${newFinalHeight}px`;
                                                                container.style.minHeight = `${newFinalHeight}px`;
                                                            }
                                                        }
                                                    }, 500);
                                                }
                                            } catch (error) {
                                                // Cross-origin restrictions, try alternative approach
                                                console.log('Cannot access iframe content, using fallback height');
                                                
                                                // Fallback: set a larger height to avoid scrolling
                                                iframe.style.height = '1200px';
                                                iframe.style.minHeight = '1200px';
                                                iframe.style.overflow = 'hidden';
                                                
                                                const container = iframe.parentElement;
                                                if (container) {
                                                    container.style.height = '1200px';
                                                    container.style.minHeight = '1200px';
                                                }
                                            }
                                        }, 100); // Small delay to ensure content is loaded
                                            }
                                        }}
                                        onError={(e) => {
                                            console.error('Iframe failed to load:', e, 'URL:', htmlPageUrl);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Code View with flip animation
                    <div 
                        className={cn("relative", isFullScreen && "h-full")}
                        style={{ perspective: '1000px' }}
                    >
                        <div
                            className="transition-transform duration-700 ease-in-out transform-gpu"
                            style={{
                                transformStyle: 'preserve-3d',
                                transform: 'rotateY(0deg)'
                            }}
                        >
                            <div
                                style={{ 
                                    backfaceVisibility: 'hidden',
                                    WebkitBackfaceVisibility: 'hidden'
                                }}
                            >
                                <div ref={topRef} style={{ height: "1px" }} />
                                <div
                                    ref={bottomRef}
                                    className={cn(
                                        "transition-all duration-300 ease-in-out relative",
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
                                    
                                    {/* Floating View Button for HTML Documents */}
                                    {isCompleteHTMLDocument(code) && !isCollapsed && (
                                        <button
                                            onClick={handleViewHTML}
                                            disabled={isCreatingPage}
                                            className={cn(
                                                "absolute bottom-4 right-4 z-20",
                                                "flex items-center gap-2 px-4 py-2 rounded-full",
                                                "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600",
                                                "text-white text-sm font-medium",
                                                "shadow-lg hover:shadow-xl",
                                                "transition-all duration-200 ease-in-out",
                                                "transform hover:scale-105",
                                                isCreatingPage && "opacity-50 cursor-not-allowed"
                                            )}
                                            title="View HTML Page"
                                        >
                                            {isCreatingPage ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    <span>Creating...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Globe className="w-4 h-4" />
                                                    <span>View</span>
                                                </>
                                            )}
                                        </button>
                                    )}
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
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CodeBlock;
