import React from "react";
import { AppletInputProps } from "@/features/applet/runner/layouts/core/AppletInputLayoutManager";
import SidebarSearchLayout from "@/features/applet/runner/layouts/options/SidebarSearchLayout";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectActiveAppletContainers } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";

const FullWidthSidebarSearchLayout: React.FC<AppletInputProps> = (props) => {
  return <SidebarSearchLayout {...props} fullWidth={true} />;
};

export default FullWidthSidebarSearchLayout;