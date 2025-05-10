import Default from './Default';
import Minimal from './Minimal';
import Banner from './Banner';
import SideBySide from './SideBySide';
import Modern from './Modern';
import QuarterThreeQuarters from './QuarterThreeQuarters';

// Add any other variants here as they're created
const variants = {
  default: Default,
  minimal: Minimal,
  banner: Banner,
  sideBySide: SideBySide,
  modern: Modern,
  QuarterThreeQuarters: QuarterThreeQuarters,
};

export type AppDisplayVariant = keyof typeof variants;

export const getAppDisplayComponent = (variant: AppDisplayVariant = 'default') => {
  return variants[variant.toLowerCase() as AppDisplayVariant] || variants.default;
};

export default getAppDisplayComponent;
