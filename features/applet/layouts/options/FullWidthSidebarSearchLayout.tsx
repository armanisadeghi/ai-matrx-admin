import React from "react";
import { AppletInputProps } from "@/features/applet/layouts/options/layout.types";
import SidebarSearchLayout from "@/features/applet/layouts/options/SidebarSearchLayout";

const FullWidthSidebarSearchLayout: React.FC<AppletInputProps> = (props) => {
  return <SidebarSearchLayout {...props} fullWidth={true} />;
};

export default FullWidthSidebarSearchLayout;