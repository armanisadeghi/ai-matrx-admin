import React from "react";
import { PanelTopOpen } from "lucide-react";
import IconSelect from "@/components/official/IconSelect";

const NavigationSelectIcon = ({ currentPage, pages, getFullPath, handleNavigation }) => {
  // Convert pages to the format expected by IconSelect
  const navigationItems = pages.map((page, index) => ({
    id: page.path || String(index),
    label: page.title,
    value: getFullPath(page)
  }));

  return (
    <IconSelect
      items={navigationItems}
      icon={<PanelTopOpen className="h-5 w-5 opacity-70" />}
      value={currentPage ? getFullPath(currentPage) : undefined}
      onValueChange={handleNavigation}
    />
  );
};

export default NavigationSelectIcon;
