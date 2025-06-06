'use client';

import React from 'react';
import { BaseNode } from '@/features/workflows/types';
import {
  BasicInfoSection,
  FunctionInfoSection,
  ArgumentsMappingsSection,
  DependenciesSection
} from './overview-sections';

// Define section IDs for customization
export type OverviewSectionId = 'basic-info' | 'function-info' | 'arguments-mappings' | 'dependencies';

export interface OverviewTabProps {
  node: BaseNode;
  onNodeUpdate: (updatedNode: BaseNode) => void;
  hiddenSections?: OverviewSectionId[];
  customSections?: Partial<Record<OverviewSectionId, React.ComponentType<{ node: BaseNode; onNodeUpdate: (updatedNode: BaseNode) => void }>>>;
}

/**
 * OverviewTab - Modular overview tab that allows for granular customization
 * 
 * Each section can be:
 * - Hidden using hiddenSections prop
 * - Replaced with custom components using customSections prop
 * - Used as-is for default behavior
 */
const OverviewTab: React.FC<OverviewTabProps> = ({ 
  node,
  onNodeUpdate,
  hiddenSections = [],
  customSections = {}
}) => {
  // Define default sections
  const defaultSections: Record<OverviewSectionId, React.ComponentType<{ node: BaseNode; onNodeUpdate: (updatedNode: BaseNode) => void }>> = {
    'basic-info': BasicInfoSection,
    'function-info': FunctionInfoSection,
    'arguments-mappings': ArgumentsMappingsSection,
    'dependencies': DependenciesSection
  };

  // Build final sections (default + custom overrides - hidden)
  const finalSections = Object.entries(defaultSections)
    .filter(([sectionId]) => !hiddenSections.includes(sectionId as OverviewSectionId))
    .map(([sectionId, DefaultComponent]) => {
      const CustomComponent = customSections[sectionId as OverviewSectionId];
      return {
        id: sectionId,
        Component: CustomComponent || DefaultComponent
      };
    });

  return (
    <div className="space-y-4 p-4">
      {finalSections.map(({ id, Component }) => (
        <Component key={id} node={node} onNodeUpdate={onNodeUpdate} />
      ))}
    </div>
  );
};

export default OverviewTab; 