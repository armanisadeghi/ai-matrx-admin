'use client';

import React, { useState } from "react";
import { Copy, FileText, Eye, Globe, Brain, Edit, Mail, Volume2, Save, CheckSquare, FileCode } from "lucide-react";
import { copyToClipboard } from "@/components/matrx/buttons/markdown-copy-utils";
import { loadWordPressCSS } from "@/features/html-pages/css/wordpress-styles";
import AdvancedMenu, { MenuItem } from "@/components/official/AdvancedMenu";
import { EmailInputDialog } from "@/components/dialogs/EmailInputDialog";
import { AuthGateDialog } from "@/components/dialogs/AuthGateDialog";
import { useSelector } from "react-redux";
import { selectUser } from "@/lib/redux/slices/userSlice";

interface PublicMessageOptionsMenuProps {
  content: string;
  onClose: () => void;
  onShowHtmlPreview?: (html: string, title?: string) => void;
  onEditContent?: () => void;
  isOpen: boolean;
  anchorElement?: HTMLElement | null;
}

/**
 * Public version of MessageOptionsMenu.
 * - Always available: Edit, Copy (plain/Docs/with thinking), HTML Preview/Export, Email, Save as file
 * - Auth-gated (prompts sign-in, keeps page state): Save to Notes, Add to Tasks, Play Audio
 * - Email: sends to account email if authenticated, otherwise prompts for address
 */
const PublicMessageOptionsMenu: React.FC<PublicMessageOptionsMenuProps> = ({
  content,
  onClose,
  onShowHtmlPreview,
  onEditContent,
  isOpen,
  anchorElement,
}) => {
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [authGateFeature, setAuthGateFeature] = useState<{ name: string; description?: string }>({ name: 'this feature' });

  const user = useSelector(selectUser);
  const isAuthenticated = !!user?.email;

  const openAuthGate = (name: string, description?: string) => {
    setAuthGateFeature({ name, description });
    setShowAuthGate(true);
  };

  const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error) return error.message || fallback;
    if (typeof error === 'string') return error || fallback;
    return fallback;
  };

  // ── Auth-gated handlers ────────────────────────────────────────────────────

  const handleSaveToNotes = () => {
    if (isAuthenticated) {
      // TODO: route to notes quick-save once user is in authenticated shell
      openAuthGate('Save to Notes', 'Sign in to save this response to your notes. You\'ll be brought right back.');
    } else {
      openAuthGate('Save to Notes', 'Sign in to save this response to your notes. You\'ll be brought right back.');
    }
    onClose();
  };

  const handleAddToTasks = () => {
    openAuthGate('Add to Tasks', 'Sign in to add this response as a task. You\'ll be brought right back.');
    onClose();
  };

  const handlePlayAudio = () => {
    openAuthGate('Play Audio', 'Sign in to use AI voice playback. You\'ll be brought right back.');
    onClose();
  };

  // ── Email handler ──────────────────────────────────────────────────────────

  const handleEmailToMe = async () => {
    if (isAuthenticated) {
      const response = await fetch('/api/chat/email-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          metadata: { timestamp: new Date().toLocaleString() },
        }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.msg || 'Failed to send email');
      }
      onClose();
    } else {
      setShowEmailDialog(true);
      onClose();
    }
  };

  const handleSendEmail = async (email: string) => {
    const response = await fetch('/api/public/email', {
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

  // ── Edit handler ───────────────────────────────────────────────────────────

  const handleEditContent = () => {
    if (onEditContent) onEditContent();
    onClose();
  };

  // ── Save as file ───────────────────────────────────────────────────────────

  const handleSaveAsFile = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `ai-response-${timestamp}.md`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onClose();
  };

  // ── Copy handlers ──────────────────────────────────────────────────────────

  const handleCopyPlain = async () => {
    await copyToClipboard(content, {
      onSuccess: () => {},
      onError: (error) => {
        throw new Error(getErrorMessage(error, "Failed to copy text"));
      }
    });
  };

  const handleCopyGoogleDocs = async () => {
    await copyToClipboard(content, {
      isMarkdown: true,
      formatForGoogleDocs: true,
      onSuccess: () => {},
      onError: (error) => {
        throw new Error(getErrorMessage(error, "Failed to copy for Google Docs"));
      }
    });
  };

  const handleCopyWithThinking = async () => {
    await copyToClipboard(content, {
      isMarkdown: true,
      includeThinking: true,
      onSuccess: () => {},
      onError: (error) => {
        throw new Error(getErrorMessage(error, "Failed to copy with thinking"));
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
        throw new Error(getErrorMessage(error, "Failed to generate HTML preview"));
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
              throw new Error(getErrorMessage(error, "Failed to copy HTML"));
            }
          });
        } catch (error) {
          throw new Error("Failed to generate complete HTML");
        }
      },
      onSuccess: () => {},
      onError: (error) => {
        throw new Error(getErrorMessage(error, "Failed to generate HTML"));
      }
    });
  };

  // ── Menu items ─────────────────────────────────────────────────────────────

  const menuItems: MenuItem[] = [
    {
      key: 'edit-content',
      icon: Edit,
      iconColor: "text-emerald-500 dark:text-emerald-400",
      label: "Edit content",
      action: handleEditContent,
      category: "Edit",
      successMessage: "Opening editor...",
      errorMessage: "Failed to open editor",
      showToast: false,
    },
    // Audio — auth-gated
    {
      key: 'play-audio',
      icon: Volume2,
      iconColor: "text-indigo-500 dark:text-indigo-400",
      label: "Play audio",
      action: handlePlayAudio,
      category: "Edit",
      successMessage: "Opening sign-in...",
      errorMessage: "Failed",
      showToast: false,
    },
    // Copy
    {
      key: 'copy-plain',
      icon: Copy,
      iconColor: "text-blue-500 dark:text-blue-400",
      label: "Copy text",
      action: handleCopyPlain,
      category: "Copy",
      successMessage: "Plain text copied",
      errorMessage: "Failed to copy text",
    },
    {
      key: 'copy-docs',
      icon: FileText,
      iconColor: "text-green-500 dark:text-green-400",
      label: "Copy for Docs",
      action: handleCopyGoogleDocs,
      category: "Copy",
      successMessage: "Formatted for Google Docs",
      errorMessage: "Failed to copy",
    },
    {
      key: 'copy-thinking',
      icon: Brain,
      iconColor: "text-purple-500 dark:text-purple-400",
      label: "With thinking",
      action: handleCopyWithThinking,
      category: "Copy",
      successMessage: "Copied with thinking blocks",
      errorMessage: "Failed to copy",
    },
    // Export
    {
      key: 'html-preview',
      icon: Eye,
      iconColor: "text-indigo-500 dark:text-indigo-400",
      label: "HTML preview",
      action: handleHtmlPreview,
      category: "Export",
      successMessage: "Preview opened",
      errorMessage: "Failed to open preview",
    },
    {
      key: 'copy-html',
      icon: Globe,
      iconColor: "text-orange-500 dark:text-orange-400",
      label: "Copy HTML page",
      action: handleCopyCompleteHTML,
      category: "Export",
      successMessage: "HTML page copied",
      errorMessage: "Failed to copy HTML",
    },
    {
      key: 'email-to-me',
      icon: Mail,
      iconColor: "text-sky-500 dark:text-sky-400",
      label: "Email to me",
      action: handleEmailToMe,
      category: "Export",
      successMessage: isAuthenticated ? "Email sent!" : "Opening email form...",
      errorMessage: "Failed to send email",
      showToast: isAuthenticated,
    },
    {
      key: 'save-file',
      icon: FileCode,
      iconColor: "text-rose-500 dark:text-rose-400",
      label: "Save as file",
      action: handleSaveAsFile,
      category: "Export",
      successMessage: "File saved!",
      errorMessage: "Failed to save file",
    },
    // Actions — auth-gated
    {
      key: 'add-to-tasks',
      icon: CheckSquare,
      iconColor: "text-blue-500 dark:text-blue-400",
      label: "Add to Tasks",
      action: handleAddToTasks,
      category: "Actions",
      successMessage: "Opening sign-in...",
      errorMessage: "Failed",
      showToast: false,
    },
    {
      key: 'save-notes',
      icon: Save,
      iconColor: "text-violet-500 dark:text-violet-400",
      label: "Save to Notes",
      action: handleSaveToNotes,
      category: "Actions",
      successMessage: "Opening sign-in...",
      errorMessage: "Failed",
      showToast: false,
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

      <AuthGateDialog
        isOpen={showAuthGate}
        onClose={() => setShowAuthGate(false)}
        featureName={authGateFeature.name}
        featureDescription={authGateFeature.description}
      />
    </>
  );
};

export default PublicMessageOptionsMenu;
