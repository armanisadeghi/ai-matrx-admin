import React, { useRef, useEffect } from "react";
import { Database, BookText, FileText, Briefcase, Copy, FileCode, Eye, Globe } from "lucide-react";
import { copyToClipboard } from "@/components/matrx/buttons/markdown-copy-utils";
import { markdownToWordPressHTML } from "@/components/matrx/buttons/markdown-wordpress-utils";

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
    try {
      // Generate the HTML content
      const htmlContent = markdownToWordPressHTML(content);
      
      // Fetch the CSS (same logic as in HtmlPreviewModal)
      let cssContent = '';
      try {
        const response = await fetch('/components/matrx/buttons/matrx-wordpress-styles-example.css');
        if (response.ok) {
          cssContent = await response.text();
        } else {
          // Fallback CSS if file can't be loaded
          cssContent = getBasicWordPressCSS();
        }
      } catch (error) {
        console.warn('Could not load WordPress CSS file, using basic styles');
        cssContent = getBasicWordPressCSS();
      }

      // Generate complete HTML page
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
    ${htmlContent}
</body>
</html>`;

      // Copy to clipboard
      await navigator.clipboard.writeText(completeHTML);
      console.log('Complete HTML page copied to clipboard');
    } catch (error) {
      console.error('Failed to copy complete HTML:', error);
    }
  };

  const getBasicWordPressCSS = () => {
    return `/* Basic WordPress styles fallback */
.matrx-content-container {
    width: 100%;
    padding: 2rem;
    line-height: 1.6;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.matrx-h1 { font-size: 2.5rem; font-weight: 700; margin: 0 0 1.5rem 0; color: #1a1a1a; }
.matrx-h2 { font-size: 1.8rem; font-weight: 600; margin: 3rem 0 1rem 0; color: #2a2a2a; border-bottom: 2px solid #e5e5e5; padding-bottom: 0.75rem; }
.matrx-h3 { font-size: 1.3rem; font-weight: 600; margin: 2rem 0 1rem 0; color: #3a3a3a; }
.matrx-paragraph { font-size: 1rem; color: #4a4a4a; margin-bottom: 1.5rem; }
.matrx-intro { font-size: 1.1rem; color: #4a4a4a; margin-bottom: 2rem; padding: 1.5rem; background: #f8f9fa; border-left: 4px solid #d1d5db; border-radius: 0 8px 8px 0; }
.matrx-list { margin: 1.5rem 0; padding-left: 0; }
.matrx-bullet-list { list-style: none; }
.matrx-list-item { margin-bottom: 1rem; padding-left: 1.5rem; position: relative; color: #4a4a4a; }
.matrx-list-item::before { content: "•"; color: #6b7280; font-weight: bold; position: absolute; left: 0; top: 0; font-size: 1.2rem; }
.matrx-strong { font-weight: 600; color: #2a2a2a; }
.matrx-em { font-style: italic; color: #2a2a2a; }
.matrx-link { color: #374151; text-decoration: underline; }
.matrx-faq-item { margin-bottom: 2rem; padding: 1.5rem; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #d1d5db; }
.matrx-faq-question { font-size: 1.2rem; font-weight: 600; margin: 0 0 0.75rem 0; color: #2a2a2a; }
.matrx-faq-answer { margin: 0; color: #4a4a4a; line-height: 1.6; }`;
  };

  const menuOptions = [
    // Copy Options
    { icon: <Copy size={16} />, label: "Copy plain text", action: handleCopyPlain },
    { icon: <FileText size={16} />, label: "Copy for Google Docs", action: handleCopyGoogleDocs },
    { icon: <Eye size={16} />, label: "HTML preview", action: handleHtmlPreview },
    { icon: <Globe size={16} />, label: "Copy complete HTML", action: handleCopyCompleteHTML },
    // Existing Options
    { icon: <Database size={16} />, label: "Save to data", action: () => console.log("Save to data") },
    { icon: <Briefcase size={16} />, label: "Convert to broker", action: () => console.log("Convert to broker") },
    { icon: <BookText size={16} />, label: "Add to docs", action: () => console.log("Add to docs") },
    { icon: <FileCode size={16} />, label: "Save as file", action: () => console.log("Save as file") }
  ];

  return (
    <>
      <div 
        ref={menuRef}
        className="absolute left-0 bottom-8 z-10 bg-white dark:bg-zinc-800 shadow-lg rounded-md min-w-48 py-1 border border-zinc-200 dark:border-zinc-700"
      >
        {menuOptions.map((option, index) => (
          <button
            key={index}
            className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-zinc-100 dark:hover:bg-zinc-700"
            onClick={() => {
              option.action();
            }}
          >
            <span className="mr-2">{option.icon}</span>
            {option.label}
          </button>
        ))}
      </div>

    </>
  );
};

export default MessageOptionsMenu;