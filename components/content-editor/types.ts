// components/content-editor/types.ts

export type EditorMode = 'plain' | 'wysiwyg' | 'markdown' | 'preview';

export interface HeaderAction {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: (content: string) => void;
}

export interface ContentEditorProps {
  // Content
  value: string;
  onChange: (value: string) => void;
  
  // Editor modes
  availableModes?: EditorMode[];
  initialMode?: EditorMode;
  mode?: EditorMode; // Controlled mode from parent
  onModeChange?: (mode: EditorMode) => void;
  
  // Auto-save
  autoSave?: boolean;
  autoSaveDelay?: number;
  onSave?: (content: string) => Promise<void> | void;
  
  // Collapsible
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  title?: string;
  
  // Header actions
  headerActions?: HeaderAction[];
  
  // Built-in features
  showCopyButton?: boolean;
  showContentManager?: boolean;
  onShowHtmlPreview?: (html: string, title?: string) => void;
  
  // UI
  placeholder?: string;
  showModeSelector?: boolean;
  className?: string;
}

export interface EditorModeConfig {
  value: EditorMode;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}

