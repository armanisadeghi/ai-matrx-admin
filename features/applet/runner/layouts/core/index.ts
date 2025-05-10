// Export core layout components
import AppletInputLayoutWrapper from './AppletLayoutWrapper';
import OpenContainerGroup from './OpenContainerGroup';
import SearchField from './SearchField';
import SearchGroupField from './SearchGroupField';
import StepperSearchGroup from './StepperSearchGroup';
import UniformHeightWrapper, { UniformHeightContext, UniformHeightProvider } from './UniformHeightWrapper';
import VerticalSearchGroup from './VerticalSearchGroup';

export {
  AppletInputLayoutWrapper as AppletLayoutWrapper,
  OpenContainerGroup as OpenSearchGroup,
  SearchField,
  SearchGroupField,
  StepperSearchGroup,
  UniformHeightWrapper,
  UniformHeightContext,
  UniformHeightProvider,
  VerticalSearchGroup
};

// Re-export relevant types
export type { 
  SearchFieldProps,
  SearchGroupRendererProps,
  AppletInputProps as SearchLayoutProps
} from '@/features/applet/layouts/options/layout.types';
