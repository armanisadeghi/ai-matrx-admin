// EditorHeader.tsx
interface EditorHeaderProps {
    onInsertChip: (content: string) => void;
    onProcessContent: () => void;
    editorId: string;
  }
  
  const DEFAULT_CHIPS = ["Placeholder", "Task", "Note"];
  
  export const EditorHeader: React.FC<EditorHeaderProps> = ({
    onInsertChip,
    onProcessContent,
    editorId,
  }) => {
    return (
      <div className="mb-4 flex gap-2">
        {DEFAULT_CHIPS.map((chip) => (
          <button
            key={`${editorId}-${chip}`}
            onClick={() => onInsertChip(chip)}
            className="px-3 py-1 rounded-md bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            Insert {chip}
          </button>
        ))}
        <button
          onClick={onProcessContent}
          className="px-3 py-1 rounded-md bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
        >
          Process Content
        </button>
      </div>
    );
  };