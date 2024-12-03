import SplitLayout from "./SplitLayout";
import SideBySideLayout from "./SideBySideLayout";
import StackedLayout from "./StackedLayout";
import EnhancedCard from "./EnhancedCard";
import LayoutHeader from "./LayoutHeader";

export const LAYOUT_COMPONENTS = {
    split: SplitLayout,
    sideBySide: SideBySideLayout,
    stacked: StackedLayout,
} as const;

export const LAYOUT_PARTS = {
    CARD: EnhancedCard,
    HEADER: LayoutHeader,
}

export {default as EnhancedCard} from './EnhancedCard';
export {default as LayoutHeader} from './LayoutHeader';
