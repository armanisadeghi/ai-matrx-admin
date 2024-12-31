import CursorTracker from "./CursorTracker";
import SelectionTracker from "./SelectionTracker";

// EditorTracking.tsx
export const EditorTracking: React.FC<{
    editorRef: React.RefObject<HTMLDivElement>;
  }> = ({ editorRef }) => {
    return (
      <div className="flex items-center gap-4">
        <CursorTracker editorRef={editorRef} />
        <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
        <SelectionTracker editorRef={editorRef} />
      </div>
    );
  };
  
  export default EditorTracking;