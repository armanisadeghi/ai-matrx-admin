import React, { useRef, useEffect } from "react";
import { Database, BookText, FileText, Briefcase, Copy, FileCode, Eye, Globe, Brain } from "lucide-react";
import { copyToClipboard } from "@/components/matrx/buttons/markdown-copy-utils";
import { loadWordPressCSS } from "@/features/html-pages/css/wordpress-styles";

interface MessageOptionsMenuProps {
  content: string;
  onClose: () => void;
  onShowHtmlPreview?: (html: string, title?: string) => void;
}

const MessageOptionsMenu: React.FC<MessageOptionsMenuProps> = ({ content, onClose, onShowHtmlPreview }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Copy handlers
  const handleCopyPlain = async () => {
    await copyToClipboard(content, {
      onSuccess: () => console.log('Copied plain text'),
      onError: (error) => console.error('Copy failed:', error)
    });
  };

  const handleCopyGoogleDocs = async () => {
    await copyToClipboard(content, {
      isMarkdown: true,
      formatForGoogleDocs: true,
      onSuccess: () => console.log('Copied for Google Docs'),
      onError: (error) => console.error('Copy failed:', error)
    });
  };

  const handleCopyWithThinking = async () => {
    await copyToClipboard(content, {
      isMarkdown: true,
      includeThinking: true,
      onSuccess: () => console.log('Copied with thinking content'),
      onError: (error) => console.error('Copy failed:', error)
    });
  };

  const handleHtmlPreview = async () => {
    console.log('HTML preview handler called');
    if (!onShowHtmlPreview) {
      console.error('onShowHtmlPreview handler not provided');
      return;
    }
    
    await copyToClipboard(content, {
      isMarkdown: true,
      formatForWordPress: true,
      showHtmlPreview: true,
      onShowHtmlPreview: (html) => {
        console.log('Calling parent HTML preview handler', { htmlLength: html.length });
        onShowHtmlPreview(html, 'WordPress HTML Preview');
        // Close the menu after modal opens
        onClose();
      },
      onSuccess: () => console.log('HTML preview opened'),
      onError: (error) => console.error('HTML preview failed:', error)
    });
  };

  const handleCopyCompleteHTML = async () => {
    // Use the centralized copyToClipboard system to ensure thinking content is filtered
    await copyToClipboard(content, {
      isMarkdown: true,
      formatForWordPress: true,
      showHtmlPreview: true,
      onShowHtmlPreview: async (filteredHtml) => {
        try {
          // Use centralized CSS system
          const cssContent = await loadWordPressCSS();

          // Generate complete HTML page with FILTERED content
          const completeHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WordPress Content</title>
    <style>
${cssContent}
    </style>
</head>
<body>
    ${filteredHtml}
</body>
</html>`;

          // Now copy the complete HTML (which contains filtered content)
          await copyToClipboard(completeHTML, {
            onSuccess: () => console.log('Complete HTML page copied to clipboard'),
            onError: (error) => console.error('Failed to copy complete HTML:', error)
          });
        } catch (error) {
          console.error('Failed to generate complete HTML:', error);
        }
      },
      onSuccess: () => {},
      onError: (error) => console.error('HTML generation failed:', error)
    });
  };


  const menuOptions = [
    // Copy Options
    { 
      icon: <Copy size={16} className="text-blue-500" />, 
      label: "Copy text", 
      action: handleCopyPlain,
      category: "copy"
    },
    { 
      icon: <FileText size={16} className="text-green-500" />, 
      label: "Copy for Docs", 
      action: handleCopyGoogleDocs,
      category: "copy"
    },
    { 
      icon: <Brain size={16} className="text-purple-500" />, 
      label: "Copy With Thinking", 
      action: handleCopyWithThinking,
      category: "copy"
    },
    { 
      icon: <Eye size={16} className="text-purple-500" />, 
      label: "HTML preview", 
      action: handleHtmlPreview,
      category: "copy"
    },
    { 
      icon: <Globe size={16} className="text-orange-500" />, 
      label: "Copy HTML page", 
      action: handleCopyCompleteHTML,
      category: "copy"
    },
    // Existing Options
    { 
      icon: <Database size={16} className="text-indigo-500" />, 
      label: "Save to data", 
      action: () => console.log("Save to data"),
      category: "action"
    },
    { 
      icon: <Briefcase size={16} className="text-amber-500" />, 
      label: "Convert to broker", 
      action: () => console.log("Convert to broker"),
      category: "action"
    },
    { 
      icon: <BookText size={16} className="text-emerald-500" />, 
      label: "Add to docs", 
      action: () => console.log("Add to docs"),
      category: "action"
    },
    { 
      icon: <FileCode size={16} className="text-rose-500" />, 
      label: "Save as file", 
      action: () => console.log("Save as file"),
      category: "action"
    }
  ];

  return (
    <>
      <div 
        ref={menuRef}
        className="absolute left-0 bottom-8 z-10 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-sm shadow-xl rounded-xl min-w-52 py-2 border border-zinc-200/50 dark:border-zinc-700/50"
      >
        {menuOptions.map((option, index) => {
          const isFirstCopyOption = index === 0;
          const isFirstActionOption = option.category === "action" && menuOptions[index - 1]?.category === "copy";
          
          return (
            <div key={index}>
              {isFirstActionOption && (
                <div className="h-px bg-zinc-200 dark:bg-zinc-700 mx-2 my-1" />
              )}
              <button
                className="flex items-center w-full px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-all duration-150 group rounded-lg mx-1"
                onClick={() => {
                  option.action();
                }}
              >
                <span className="mr-3 flex-shrink-0 group-hover:scale-110 transition-transform duration-150">
                  {option.icon}
                </span>
                <span className="font-medium">{option.label}</span>
              </button>
            </div>
          );
        })}
      </div>

    </>
  );
};

export default MessageOptionsMenu;