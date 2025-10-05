import Default from './Default';
import Glass from './Glass';
import Enhanced from './Enhanced';
import Modern from './Modern';
import Simple from './Simple';
import Compact from './Compact';

// Add any other variants here as they're created
const variants = {
  default: Default,
  glass: Glass,
  enhanced: Enhanced,
  modern: Modern,
  simple: Simple,
  compact: Compact,
};

export type AppletCardVariant = keyof typeof variants;

export const getAppletCardComponent = (variant: AppletCardVariant = 'default', isMobile: boolean) => {
  return variants[variant] || variants.default;
};

export default getAppletCardComponent;
