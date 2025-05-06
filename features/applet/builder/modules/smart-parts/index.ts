// Import all components

// Applets components
import AppletSelectorOverlay from './applets/AppletSelectorOverlay';
import MultiAppletSelector from './applets/MultiAppletSelector';
import SmartAppletList from './applets/SmartAppletList';
import SmartAppletListWrapper from './applets/SmartAppletListWrapper';
import AppletFormComponent from './applets/AppletFormComponent';

// Apps components
import AppSelectorOverlay from './apps/AppSelectorOverlay';
import SmartAppList from './apps/SmartAppList';
import SmartAppListWrapper from './apps/SmartAppListWrapper';

// Fields components
import FieldSelectorOverlay from './fields/FieldSelectorOverlay';
import MultiFieldSelector from './fields/MultiFieldSelector';
import SmartFieldsList from './fields/SmartFieldsList';
import SmartFieldsListWrapper from './fields/SmartFieldsListWrapper';

// Groups components
import GroupSelectorOverlay from './containers/GroupSelectorOverlay';
import MultiGroupSelector from './containers/MultiGroupSelector';
import SmartContainerList from './containers/SmartContainerList';
import SmartGroupListWrapper from './containers/SmartGroupListWrapper';
import { getFieldComponentStyle } from "@/features/applet/builder/styles";

// Re-export all components from subdirectories
export * from './applets';
export * from './apps';
export * from './containers';
export * from './fields';
export * from '../../styles';

// Export all components
export {
  // Applets
  AppletSelectorOverlay,
  MultiAppletSelector,
  SmartAppletList,
  SmartAppletListWrapper,
  AppletFormComponent,
  
  // Apps
  AppSelectorOverlay,
  SmartAppList,
  SmartAppListWrapper,
  
  // Fields
  FieldSelectorOverlay,
  MultiFieldSelector,
  SmartFieldsList,
  SmartFieldsListWrapper,
  
  // Groups
  GroupSelectorOverlay,
  MultiGroupSelector,
  SmartContainerList as SmartGroupList,
  SmartGroupListWrapper,
  getFieldComponentStyle
};
