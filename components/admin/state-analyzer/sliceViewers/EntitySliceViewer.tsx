// state-analyzer/sliceViewers/EntitySliceViewer.tsx
import React from "react";

interface EntitySliceViewerProps {
  sliceKey: string;
  state: any;
}

const EntitySliceViewer: React.FC<EntitySliceViewerProps> = ({ sliceKey, state }) => {
  return (
    <div className="p-4 h-full">
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg overflow-auto h-full">
        {/* Custom implementation for entities slice */}
        <h3 className="text-lg font-semibold mb-4">Entity Counts</h3>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(state).map(([entityType, entities]: [string, any]) => (
            <div key={entityType} className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
              <h4 className="font-medium">{entityType}</h4>
              <p className="text-2xl font-bold">{Object.keys(entities).length}</p>
            </div>
          ))}
        </div>
        
        {/* You can add more custom visualizations here */}
      </div>
    </div>
  );
};

export default EntitySliceViewer;