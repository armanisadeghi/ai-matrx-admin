import React, { useState } from "react";
import { Database, BookText, FileText, Briefcase, Copy, FileCode, Eye, Globe, Brain, Save, Volume2, Edit } from "lucide-react";
import { copyToClipboard } from "@/components/matrx/buttons/markdown-copy-utils";
import { loadWordPressCSS } from "@/features/html-pages/css/wordpress-styles";
import AdvancedMenu, { MenuItem } from "@/components/official/AdvancedMenu";
import { NotesAPI } from "@/features/notes";
import { QuickSaveModal } from "@/features/notes";
import { useTextToSpeech } from "@/features/tts";
import { useAppSelector } from "@/lib/redux/hooks";
import { toast } from "sonner";

interface MessageOptionsMenuProps {
  content: string;
  onClose: () => void;
  onShowHtmlPreview?: (html: string, title?: string) => void;
  onEditContent?: () => void;
  isOpen: boolean;
  anchorElement?: HTMLElement | null;
}

const MessageOptionsMenu: React.FC<MessageOptionsMenuProps> = ({ content, onClose, onShowHtmlPreview, onEditContent, isOpen, anchorElement }) => {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  
  // Get user's TTS preferences from userPreferences
  const preferredVoice = useAppSelector((state) => state.userPreferences?.textToSpeech?.preferredVoice || 'Cheyenne-PlayAI');
  const ttsProcessMarkdown = useAppSelector((state) => state.userPreferences?.textToSpeech?.processMarkdown ?? true);
  
  // TTS hook
  const { speak, isGenerating: isTtsGenerating, isPlaying: isTtsPlaying } = useTextToSpeech({
    defaultVoice: preferredVoice,
    autoPlay: true,
    processMarkdown: ttsProcessMarkdown,
    onError: (error) => {
      toast.error('Speech playback failed', { description: error });
    },
    onPlaybackStart: () => {
      toast.success('Playing audio...', {
        description: `Using ${preferredVoice} voice`,
      });
    },
  });

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

  // TTS handler
  const handlePlayAudio = async () => {
    await speak(content);
  };

  // Edit Content handler
  const handleEditContent = () => {
    if (onEditContent) {
      onEditContent();
      onClose();
    }
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
      disabled: !onEditContent,
      showToast: false
    },
    // Audio Option
    { 
      key: 'play-audio',
      icon: Volume2, 
      iconColor: "text-indigo-500 dark:text-indigo-400", 
      label: "Play audio",
      action: handlePlayAudio,
      category: "Audio",
      successMessage: "Playing audio...",
      errorMessage: "Failed to play audio",
      disabled: isTtsGenerating || isTtsPlaying,
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
    // Action Options
    { 
      key: 'save-scratch',
      icon: FileText, 
      iconColor: "text-cyan-500 dark:text-cyan-400", 
      label: "Save to Scratch",
      action: handleSaveToScratch,
      category: "Actions",
      successMessage: "Saved to Scratch!",
      errorMessage: "Failed to save"
    },
    { 
      key: 'save-notes',
      icon: Save, 
      iconColor: "text-violet-500 dark:text-violet-400", 
      label: "Save to Notes",
      action: handleSaveToNotes,
      category: "Actions",
      successMessage: "Opening save dialog...",
      errorMessage: "Failed to open dialog",
      showToast: false
    },
    { 
      key: 'convert-broker',
      icon: Briefcase, 
      iconColor: "text-amber-500 dark:text-amber-400", 
      label: "Convert to broker",
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