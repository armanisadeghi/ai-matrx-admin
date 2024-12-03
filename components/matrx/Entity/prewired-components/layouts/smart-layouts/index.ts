import SmartLayoutSplit from "./SmartLayoutSplit";
import SmartLayoutSideBySide from "./SmartLayoutSideBySide";
import SmartLayoutStacked from "./SmartLayoutStacked";
import SmartResizableLayout from "./SmartResizableLayout";


export const SMART_LAYOUT_COMPONENTS = {
    split: SmartLayoutSplit,
    sideBySide: SmartLayoutSideBySide,
    stacked: SmartLayoutStacked,
    resizable: SmartResizableLayout,
} as const;

