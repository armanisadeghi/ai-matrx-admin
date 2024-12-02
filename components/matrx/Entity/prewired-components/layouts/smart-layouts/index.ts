import SmartLayoutSplit from "./SmartLayoutSplit";
import SmartLayoutSideBySide from "./SmartLayoutSideBySide";
import SmartLayoutStacked from "./SmartLayoutStacked";


export const SMART_LAYOUT_COMPONENTS = {
    split: SmartLayoutSplit,
    sideBySide: SmartLayoutSideBySide,
    stacked: SmartLayoutStacked,
} as const;

