import Default from './Default';
import Minimal from './Minimal';
import Banner from './Banner';
import SideBySide from './SideBySide';
import Modern from './Modern';
import QuarterThreeQuarters from './QuarterThreeQuarters';
import ModernGlass from './ModernGlass';
// Add any other variants here as they're created
const variants = {
  default: Default,
  minimal: Minimal,
  banner: Banner,
  sideBySide: SideBySide,
  modern: Modern,
  QuarterThreeQuarters: QuarterThreeQuarters,
  modernGlass: ModernGlass,
};

export type AppDisplayVariant = keyof typeof variants;

export const getAppDisplayComponent = (variant: AppDisplayVariant = 'default', isMobile: boolean) => {
  return variants[variant] || variants.default;
};

export default getAppDisplayComponent;
