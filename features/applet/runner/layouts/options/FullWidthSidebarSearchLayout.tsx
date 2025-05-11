import React from "react";
import { AppletInputProps } from "@/features/applet/runner/layouts/AppletLayoutManager";
import SidebarSearchLayout from "@/features/applet/runner/layouts/options/SidebarSearchLayout";

const FullWidthSidebarSearchLayout: React.FC<AppletInputProps> = (props) => {
  return <SidebarSearchLayout {...props} fullWidth={true} />;
};

export default FullWidthSidebarSearchLayout;