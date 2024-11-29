import SplitLayout from "./SplitLayout";
import SideBySideLayout from "./SideBySideLayout";
import StackedLayout from "./StackedLayout";


export const LAYOUT_COMPONENTS = {
    split: SplitLayout,
    sideBySide: SideBySideLayout,
    stacked: StackedLayout,
} as const;

