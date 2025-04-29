// Export core layout components
import AppletLayoutWrapper from './AppletLayoutWrapper';
import LayoutWrapper from './LayoutWrapper';
import OpenSearchGroup from './OpenSearchGroup';
import SearchField from './SearchField';
import SearchGroupField from './SearchGroupField';
import StepperSearchGroup from './StepperSearchGroup';
import UniformHeightWrapper, { UniformHeightContext, UniformHeightProvider } from './UniformHeightWrapper';
import VerticalSearchGroup from './VerticalSearchGroup';

export {
  AppletLayoutWrapper,
  LayoutWrapper,
  OpenSearchGroup,
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
  SearchLayoutProps
} from '@/features/applet/layouts/options/layout.types';
