'use client';

import React, { useState } from "react";
import { Copy, FileText, Eye, Globe, Brain, Edit, Mail } from "lucide-react";
import { copyToClipboard } from "@/components/matrx/buttons/markdown-copy-utils";
import { loadWordPressCSS } from "@/features/html-pages/css/wordpress-styles";
import AdvancedMenu, { MenuItem } from "@/components/official/AdvancedMenu";
import { EmailInputDialog } from "@/components/dialogs/EmailInputDialog";

interface PublicMessageOptionsMenuProps {
  content: string;
  onClose: () => void;
  onShowHtmlPreview?: (html: string, title?: string) => void;
  onEditContent?: () => void;
  isOpen: boolean;
  anchorElement?: HTMLElement | null;
}

/**
 * Public version of MessageOptionsMenu with features that work without authentication
 * Includes: Copy (plain, Google Docs, with thinking), HTML preview/export, Edit
 * Excludes: Save to notes, TTS, Quick actions, Tasks (require auth)
 */
const PublicMessageOptionsMenu: React.FC<PublicMessageOptionsMenuProps> = ({ 
  content, 
  onClose, 
  onShowHtmlPreview, 
  onEditContent, 
  isOpen, 
  anchorElement 
}) => {
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  // Email to me handler - opens email input dialog
  const handleOpenEmailDialog = () => {
    setShowEmailDialog(true);
    onClose();
  };

  // Send email with provided address
  const handleSendEmail = async (email: string) => {
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject: `AI Chat Response - ${new Date().toLocaleDateString()}`,
        content,
        isMarkdown: true,
      }),
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.msg || 'Failed to send email');
    }
  };

  // Edit Content handler
  const handleEditContent = () => {
    if (onEditContent) {
      onEditContent();
    }
    onClose();
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

  // Build menu items for AdvancedMenu (iOS-style: icon + label only)
  // Only includes features that work without authentication
  const menuItems: MenuItem[] = [
    // Edit Content - First for easy access
    { 
      key: 'edit-content',
      icon: Edit, 
      iconColor: "text-emerald-500 dark:text-emerald-400", 
      label: "Edit content",
      action: handleEditContent,
      category: "Edit",
      successMessage: "Opening editor...",
      errorMessage: "Failed to open editor",
      showToast: false
    },
    // Copy Options
    { 
      key: 'copy-plain',
      icon: Copy, 
      iconColor: "text-blue-500 dark:text-blue-400", 
      label: "Copy text",
      action: handleCopyPlain,
      category: "Copy",
      successMessage: "Plain text copied",
      errorMessage: "Failed to copy text"
    },
    { 
      key: 'copy-docs',
      icon: FileText, 
      iconColor: "text-green-500 dark:text-green-400", 
      label: "Copy for Docs",
      action: handleCopyGoogleDocs,
      category: "Copy",
      successMessage: "Formatted for Google Docs",
      errorMessage: "Failed to copy"
    },
    { 
      key: 'copy-thinking',
      icon: Brain, 
      iconColor: "text-purple-500 dark:text-purple-400", 
      label: "With thinking",
      action: handleCopyWithThinking,
      category: "Copy",
      successMessage: "Copied with thinking blocks",
      errorMessage: "Failed to copy"
    },
    // Export Options
    { 
      key: 'html-preview',
      icon: Eye, 
      iconColor: "text-indigo-500 dark:text-indigo-400", 
      label: "HTML preview",
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
      action: handleCopyCompleteHTML,
      category: "Export",
      successMessage: "HTML page copied",
      errorMessage: "Failed to copy HTML"
    },
    { 
      key: 'email-to-me',
      icon: Mail, 
      iconColor: "text-sky-500 dark:text-sky-400", 
      label: "Email to me",
      action: handleOpenEmailDialog,
      category: "Export",
      successMessage: "Opening email...",
      showToast: false
    },
  ];

  return (
    <>
      <AdvancedMenu
        isOpen={isOpen}
        onClose={onClose}
        items={menuItems}
        title="Message Options"
        position="bottom-left"
        anchorElement={anchorElement}
      />
      
      <EmailInputDialog
        isOpen={showEmailDialog}
        onClose={() => setShowEmailDialog(false)}
        onSubmit={handleSendEmail}
        title="Email this response"
        description="Enter your email address to receive this AI response."
        submitLabel="Send to Email"
      />
    </>
  );
};

export default PublicMessageOptionsMenu;
