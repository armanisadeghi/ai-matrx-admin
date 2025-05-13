import Default from './Default';
import Grid from './Grid';
import Sidebar from './Sidebar';

// Add any other variants here as they're created
const variants = {
  default: Default,
  grid: Grid,
  sidebar: Sidebar
};

export type MainLayoutVariant = keyof typeof variants;

export const getMainLayoutComponent = (variant: MainLayoutVariant = 'default') => {
  return variants[variant] || variants.default;
};

export default getMainLayoutComponent;
