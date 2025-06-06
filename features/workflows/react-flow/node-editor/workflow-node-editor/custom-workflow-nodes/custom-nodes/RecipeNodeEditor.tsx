'use client';

import React from 'react';
import OverviewTab from '../tabs/OverviewTab';
import ArgumentsTab from '../tabs/ArgumentsTab';
import RecipeBasicInfoSection from '../tabs/overview-sections/RecipeBasicInfoSection';
import RecipeSelectionSection from '../tabs/overview-sections/RecipeSelectionSection';
import DefaultNodeEditor from '../DefaultNodeEditor';
import CustomNodeEditor from '../CustomNodeEditor';
import { BaseNode } from '@/features/workflows/types';

interface RecipeNodeEditorProps {
  node: BaseNode;
  onSave: (node: BaseNode) => void;
  onClose: () => void;
  open: boolean;
}

/**
 * RecipeNodeEditor - Custom node editor specifically for recipe nodes
 * Uses the modular OverviewTab system with custom sections
 */
const RecipeNodeEditor: React.FC<RecipeNodeEditorProps> = ({ node, onSave, onClose, open }) => {
  // Create a custom OverviewTab component with recipe-specific sections
  // Note: This component will receive onNodeUpdate from CustomNodeEditor for local state updates
  const RecipeOverviewTab = ({ node, onNodeUpdate }: { node: BaseNode; onNodeUpdate: (node: BaseNode) => void }) => (
    <OverviewTab 
      node={node}
      onNodeUpdate={onNodeUpdate}
      customSections={{
        'basic-info': RecipeBasicInfoSection,
        'function-info': RecipeSelectionSection
      }}
    />
  );

  // Create a custom ArgumentsTab component that hides recipe-specific arguments
  const RecipeArgumentsTab = ({ node, onNodeUpdate }: { node: BaseNode; onNodeUpdate: (node: BaseNode) => void }) => (
    <ArgumentsTab 
      node={node}
      onNodeUpdate={onNodeUpdate}
      argsToHide={['recipe_id', 'version', 'latest_version']}
    />
  );

  const RecipeDefaultNodeEditor = ({ node, onNodeUpdate }: { node: BaseNode; onNodeUpdate: (node: BaseNode) => void }) => (
    <DefaultNodeEditor 
      node={node}
      onNodeUpdate={onNodeUpdate}
      customTabs={[
        { 
          id: 'basic', 
          label: 'Overview', 
          component: RecipeOverviewTab,
          replaces: 'basic' // Replace the default overview tab
        },
        { 
          id: 'arguments', 
          label: 'Arguments', 
          component: RecipeArgumentsTab,
          replaces: 'arguments' // Replace the default arguments tab
        }
      ]}
    />
  );

  return (
    <CustomNodeEditor
      node={node}
      onSave={onSave}
      onClose={onClose}
      open={open}
      title="Run Recipe Configuration"
      component={RecipeDefaultNodeEditor}
    />
  );
};

export default RecipeNodeEditor;