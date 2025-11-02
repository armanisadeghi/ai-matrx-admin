import React, { useState } from "react";
import { Database, BookText, FileText, Briefcase, Copy, FileCode, Eye, Globe, Brain, Save } from "lucide-react";
import { copyToClipboard } from "@/components/matrx/buttons/markdown-copy-utils";
import { loadWordPressCSS } from "@/features/html-pages/css/wordpress-styles";
import AdvancedMenu, { MenuItem } from "@/components/official/AdvancedMenu";
import { NotesAPI } from "@/features/notes";
import { QuickSaveModal } from "@/features/notes";

interface MessageOptionsMenuProps {
  content: string;
  onClose: () => void;
  onShowHtmlPreview?: (html: string, title?: string) => void;
  isOpen: boolean;
  anchorElement?: HTMLElement | null;
}

const MessageOptionsMenu: React.FC<MessageOptionsMenuProps> = ({ content, onClose, onShowHtmlPreview, isOpen, anchorElement }) => {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  // Notes handlers
  const handleSaveToScratch = async () => {
    await NotesAPI.create({
      label: 'New Note',
      content: content,
      folder_name: 'Scratch',
      tags: [],
    });
  };

  const handleSaveToNotes = () => {
    setIsSaveModalOpen(true);
  };

  // Copy handlers - simplified without state management
  const handleCopyPlain = async () => {
    await copyToClipboard(content, {
      onSuccess: () => {},
      onError: (error) => {
        throw new Error(error.message || "Failed to copy text");
      }
    });
  };

  const handleCopyGoogleDocs = async () => {
    await copyToClipboard(content, {
      isMarkdown: true,
      formatForGoogleDocs: true,
      onSuccess: () => {},
      onError: (error) => {
        throw new Error(error.message || "Failed to copy for Google Docs");
      }
    });
  };

  const handleCopyWithThinking = async () => {
    await copyToClipboard(content, {
      isMarkdown: true,
      includeThinking: true,
      onSuccess: () => {},
      onError: (error) => {
        throw new Error(error.message || "Failed to copy with thinking");
      }
    });
  };

  const handleHtmlPreview = async () => {
    if (!onShowHtmlPreview) {
      throw new Error("HTML preview handler not configured");
    }
    
    await copyToClipboard(content, {
      isMarkdown: true,
      formatForWordPress: true,
      showHtmlPreview: true,
      onShowHtmlPreview: (html) => {
        onShowHtmlPreview(html, 'WordPress HTML Preview');
        onClose();
      },
      onSuccess: () => {},
      onError: (error) => {
        throw new Error(error.message || "Failed to generate HTML preview");
      }
    });
  };

  const handleCopyCompleteHTML = async () => {
    await copyToClipboard(content, {
      isMarkdown: true,
      formatForWordPress: true,
      showHtmlPreview: true,
      onShowHtmlPreview: async (filteredHtml) => {
        try {
          const cssContent = await loadWordPressCSS();
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

          await copyToClipboard(completeHTML, {
            onSuccess: () => {},
            onError: (error) => {
              throw new Error(error.message || "Failed to copy HTML");
            }
          });
        } catch (error) {
          throw new Error("Failed to generate complete HTML");
        }
      },
      onSuccess: () => {},
      onError: (error) => {
        throw new Error(error.message || "Failed to generate HTML");
      }
    });
  };


  // Build menu items for AdvancedMenu
  const menuItems: MenuItem[] = [
    // Copy Options
    { 
      key: 'copy-plain',
      icon: Copy, 
      iconColor: "text-blue-500 dark:text-blue-400", 
      label: "Copy text", 
      description: "Plain text to clipboard",
      action: handleCopyPlain,
      category: "Copy",
      successMessage: "Plain text copied to clipboard",
      errorMessage: "Failed to copy text"
    },
    { 
      key: 'copy-docs',
      icon: FileText, 
      iconColor: "text-green-500 dark:text-green-400", 
      label: "Copy for Docs", 
      description: "Formatted for Google Docs",
      action: handleCopyGoogleDocs,
      category: "Copy",
      successMessage: "Formatted for Google Docs",
      errorMessage: "Failed to copy for Google Docs"
    },
    { 
      key: 'copy-thinking',
      icon: Brain, 
      iconColor: "text-purple-500 dark:text-purple-400", 
      label: "With Thinking", 
      description: "Include thinking blocks",
      action: handleCopyWithThinking,
      category: "Copy",
      successMessage: "Content with thinking blocks copied",
      errorMessage: "Failed to copy with thinking"
    },
    // Export Options
    { 
      key: 'html-preview',
      icon: Eye, 
      iconColor: "text-indigo-500 dark:text-indigo-400", 
      label: "HTML preview", 
      description: "View formatted HTML",
      action: handleHtmlPreview,
      category: "Export",
      successMessage: "Preview opened",
      errorMessage: "Failed to open preview"
    },
    { 
      key: 'copy-html',
      icon: Globe, 
      iconColor: "text-orange-500 dark:text-orange-400", 
      label: "Copy HTML page", 
      description: "Complete HTML with CSS",
      action: handleCopyCompleteHTML,
      category: "Export",
      successMessage: "Complete HTML page copied",
      errorMessage: "Failed to copy HTML"
    },
    // Action Options
    { 
      key: 'save-scratch',
      icon: FileText, 
      iconColor: "text-cyan-500 dark:text-cyan-400", 
      label: "Save to Scratch", 
      description: "Quick save to Scratch folder",
      action: handleSaveToScratch,
      category: "Actions",
      successMessage: "Saved to Scratch!",
      errorMessage: "Failed to save to Scratch"
    },
    { 
      key: 'save-notes',
      icon: Save, 
      iconColor: "text-violet-500 dark:text-violet-400", 
      label: "Save to Notes", 
      description: "Edit and choose folder",
      action: handleSaveToNotes,
      category: "Actions",
      successMessage: "Opening save dialog...",
      errorMessage: "Failed to open save dialog",
      showToast: false
    },
    { 
      key: 'convert-broker',
      icon: Briefcase, 
      iconColor: "text-amber-500 dark:text-amber-400", 
      label: "Convert to broker", 
      description: "Create broker instance",
      action: () => {},
      category: "Actions",
      disabled: true,
      showToast: false
    },
    { 
      key: 'add-docs',
      icon: BookText, 
      iconColor: "text-emerald-500 dark:text-emerald-400", 
      label: "Add to docs", 
      description: "Save to documentation",
      action: () => {},
      category: "Actions",
      disabled: true,
      showToast: false
    },
    { 
      key: 'save-file',
      icon: FileCode, 
      iconColor: "text-rose-500 dark:text-rose-400", 
      label: "Save as file", 
      description: "Export to local file",
      action: () => {},
      category: "Actions",
      disabled: true,
      showToast: false
    }
  ];

  return (
    <>
      <AdvancedMenu
        isOpen={isOpen}
        onClose={onClose}
        items={menuItems}
        title="Message Options"
        description="Copy, export, or save this message"
        position="bottom-left"
        anchorElement={anchorElement}
      />
      
      <QuickSaveModal
        open={isSaveModalOpen}
        onOpenChange={setIsSaveModalOpen}
        initialContent={content}
        defaultFolder="Scratch"
        onSaved={() => {
          setIsSaveModalOpen(false);
          onClose();
        }}
      />
    </>
  );
};

export default MessageOptionsMenu;