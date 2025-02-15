import React, { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { Check, Copy, Download, Expand, Minimize, ChevronDown, ChevronUp, Edit2, Eye } from 'lucide-react';
import { cn } from "@/styles/themes/utils";
import CodeEditor from '@/components/code-editor/CodeEditor';

interface CodeBlockProps {
  code: string;
  language: string;
  fontSize?: number;
  showLineNumbers?: boolean;
  className?: string;
  onCodeChange?: (newCode: string) => void;
}

const CodeBlock: React.FC<CodeBlockProps> = ({
  code: initialCode,
  language,
  fontSize = 16,
  showLineNumbers = true,
  className,
  onCodeChange
}) => {
  const [code, setCode] = useState(initialCode);
  const [isCopied, setIsCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDark, setIsDark] = useState(false);
  
  useEffect(() => {
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    
    // Initial check
    updateTheme();
    
    // Create observer to watch for class changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          updateTheme();
        }
      });
    });
    
    // Start observing
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const blob = new Blob([code], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${language}`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
    if (isCollapsed) setIsCollapsed(false);
  };

  const toggleCollapse = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isEditing) return;
    setIsCollapsed(!isCollapsed);
    if (isExpanded) setIsExpanded(false);
  };

  const toggleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(!isEditing);
    // Auto-expand when entering edit mode
    if (!isEditing) {
      setIsExpanded(true);
      setIsCollapsed(false);
    } else {
      setIsExpanded(false);
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
      className={cn(
        "my-4 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 transition-all duration-200",
        isExpanded && "fixed inset-4 z-50 bg-white dark:bg-neutral-900",
        className
      )}
    >
      {/* Header */}
      <div 
        className={cn(
          "flex items-center justify-between px-4 py-2 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700",
          !isEditing && "cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        )}
        onClick={isEditing ? undefined : toggleCollapse}
      >
        <div className="flex items-center space-x-4">
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-neutral-500 dark:text-neutral-400 font-mono">
              {language}
            </span>
            <span className="text-xs text-neutral-400 dark:text-neutral-500">
              {code.split('\n').length} {code.split('\n').length === 1 ? 'line' : 'lines'}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            title={isCopied ? "Copied!" : "Copy code"}
          >
            {isCopied ? <Check size={16} /> : <Copy size={16} />}
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            title="Download code"
          >
            <Download size={16} />
          </button>
          <button
            onClick={toggleExpand}
            className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            title={isExpanded ? "Minimize" : "Expand"}
          >
            {isExpanded ? <Minimize size={16} /> : <Expand size={16} />}
          </button>
          {!isEditing && (
            <button
              onClick={toggleCollapse}
              className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              title={isCollapsed ? "Expand code" : "Collapse code"}
            >
              {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          )}
        </div>
      </div>

      {/* Code content with floating edit button */}
      <div className="relative">
        {/* Floating edit button */}
        <button
          onClick={toggleEdit}
          className={cn(
            "absolute top-2 right-2 z-10 p-2 rounded-md bg-neutral-100/90 dark:bg-neutral-800/90 backdrop-blur-sm",
            "hover:bg-neutral-200 dark:hover:bg-neutral-700",
            "transition-colors shadow-sm",
            "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100",
            "border border-neutral-200 dark:border-neutral-700"
          )}
          title={isEditing ? "View code" : "Edit code"}
        >
          {isEditing ? <Eye size={16} /> : <Edit2 size={16} />}
        </button>

        {isEditing ? (
          <div className={cn(
            "w-full",
            isExpanded ? "h-[calc(100vh-8rem)]" : "min-h-[200px]"
          )}>
            <CodeEditor
              defaultLanguage={language}
              defaultValue={code}
              onChange={handleCodeChange}
            />
          </div>
        ) : (
          <div className="relative">
            <SyntaxHighlighter
              language={language}
              style={isDark ? vscDarkPlus : vs}
              showLineNumbers={showLineNumbers}
              wrapLines={true}
              wrapLongLines={true}
              customStyle={{
                margin: 0,
                padding: "1rem",
                fontSize: `${fontSize}px`,
                background: isDark ? "#1E1E1E" : "#ffffff",
                height: "auto",
                minHeight: isExpanded ? "calc(100vh - 8rem)" : "auto"
              }}
            >
              {code}
            </SyntaxHighlighter>
            
            {isCollapsed && (
              <div 
                className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-neutral-900 to-transparent opacity-80 cursor-pointer"
                onClick={toggleCollapse}
              >
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-neutral-400 text-sm">
                  Click to expand {code.split('\n').length - 3} more lines
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