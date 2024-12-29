import { ContentBlock } from "../types";

const ChipList: React.FC<{ blocks: ContentBlock[] }> = ({ blocks }) => {
  const chipBlocks = blocks.filter((block) => block.type === "chip");

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Chips in Document
      </h3>
      <div className="space-y-2">
        {chipBlocks.map((chip) => (
          <div
            key={chip.id}
            className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg"
          >
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {chip.content}
            </span>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Position: {chip.position}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChipList;
