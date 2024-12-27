import { FileSystemNode } from '@/lib/redux/fileSystem/types';


export interface SelectionRange {
  start: string | null;
  end: string | null;
}

export interface DragData {
  id: string;
  isMultiDrag: boolean;
}
