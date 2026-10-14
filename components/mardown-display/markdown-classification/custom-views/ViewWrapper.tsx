'use client';

import { useState } from 'react';
import { ViewId, getViewComponent, getViewSelectOptions } from './view-registry';
import { Select } from "@ai-matrx/design-system/controls";
interface ViewWrapperProps {
  initialView: ViewId;
  showOptions?: boolean;
  data: unknown;
  className?: string;
}

export default function ViewWrapper({ 
  initialView, 
  showOptions = false, 
  data, 
  className = '' 
}: ViewWrapperProps) {
  const [selectedViewId, setSelectedViewId] = useState<ViewId>(initialView);
  const viewOptions = getViewSelectOptions();
  
  // Dynamically get the component for the selected view
  const ViewComponent = getViewComponent(selectedViewId);
  
  if (!ViewComponent) {
    return <div className="p-4">Error: View component not found</div>;
  }

  return (
    <div className={`${className}`}>
      {showOptions && (
        <div className="mb-4">
          <Select
            value={selectedViewId}
            onValueChange={(v) => setSelectedViewId(v as ViewId)}
            aria-label="View"
            options={viewOptions.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
          />
        </div>
      )}
      
      <div className="p-4">
        <ViewComponent data={data} />
      </div>
    </div>
  );
} 