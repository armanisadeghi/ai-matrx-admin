// types.ts
import { FileSystemNode } from "@/lib/redux/fileSystem/types";

export interface FileMenuAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'destructive';
  separator?: boolean;
  shortcut?: string;
}

export interface FileOperationModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: FileSystemNode | null;
  selectedNodes: FileSystemNode[];
  onConfirm?: (data?: any) => void | Promise<void>;
}

export type ModalType = 
  | 'delete' 
  | 'share' 
  | 'move' 
  | 'rename'
  | 'duplicate'
  | 'view'
  | null;

