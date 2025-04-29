import React from "react";
import { SearchLayoutProps } from "@/features/applet/layouts/options/layout.types";
import SidebarSearchLayout from "@/features/applet/layouts/options/SidebarSearchLayout";

const FullWidthSidebarSearchLayout: React.FC<SearchLayoutProps> = (props) => {
  return <SidebarSearchLayout {...props} fullWidth={true} />;
};

export default FullWidthSidebarSearchLayout;