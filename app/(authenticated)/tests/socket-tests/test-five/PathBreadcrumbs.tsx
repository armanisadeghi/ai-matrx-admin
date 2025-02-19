// PathBreadcrumbs.tsx
import React from 'react';

interface PathBreadcrumbsProps {
  currentPath: string;
  onNavigateTo: (path: string) => void;
}

const PathBreadcrumbs: React.FC<PathBreadcrumbsProps> = ({ currentPath, onNavigateTo }) => {
  if (!currentPath) return null;

  const parts = currentPath.split(".");
  let builtPath = "";

  return (
    <div className="flex items-center text-sm mb-4 flex-wrap">
      <button 
        onClick={() => onNavigateTo("")} 
        className="text-blue-600 dark:text-blue-400 hover:underline"
      >
        root
      </button>

      {parts.map((part, index) => {
        builtPath = builtPath ? `${builtPath}.${part}` : part;
        const pathForClick = builtPath;

        return (
          <React.Fragment key={index}>
            <span className="mx-1 text-gray-400 dark:text-gray-500">/</span>
            <button
              onClick={() => onNavigateTo(pathForClick)}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {part}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default PathBreadcrumbs;