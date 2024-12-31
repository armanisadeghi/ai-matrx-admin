"use client";

// EditorTools.tsx
export const EditorTools: React.FC<{
  onInsertBroker: (content: string) => void;
  onUpdate: () => void;
  onConvertToBroker: () => void;
}> = ({ onInsertBroker, onUpdate, onConvertToBroker }) => {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onInsertBroker("Broker")}
        className="px-3 py-1 rounded-md bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
      >
        Insert Broker
      </button>
      <button
        onClick={onUpdate}
        className="px-3 py-1 rounded-md bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
      >
        update
      </button>
      <button
        onClick={onConvertToBroker}
        className="px-3 py-1 rounded-md bg-yellow-500 text-white hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700"
      >
        Convert To Broker
      </button>
    </div>
  );
};

export default EditorTools;
