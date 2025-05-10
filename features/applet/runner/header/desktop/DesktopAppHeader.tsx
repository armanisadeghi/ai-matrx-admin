"use client";
import React from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAppRuntimeLayoutType } from "@/lib/redux/app-runner/slices/customAppRuntimeSlice";
import { AppLayoutOptions } from "./HeaderLogic";
import { CustomAppHeaderProps } from "../CustomAppHeader";
import { TabbedAppletsHeader } from "./TabbedAppletsHeader";
import { SingleDropdownHeader } from "./SingleDropdownHeader";
import { MultiDropdownHeader } from "./MultiDropdownHeader";
import { SingleDropdownWithSearchHeader } from "./SingleDropdownWithSearchHeader";
import { IconsHeader } from "./IconsHeader";

export const DesktopAppHeader: React.FC<CustomAppHeaderProps> = (props) => {
  const layoutType = useAppSelector(selectAppRuntimeLayoutType) as AppLayoutOptions;

  switch (layoutType) {
    case "tabbedApplets":
      return <TabbedAppletsHeader {...props} />;
    case "singleDropdown":
      return <SingleDropdownHeader {...props} />;
    case "multiDropdown":
      return <MultiDropdownHeader {...props} />;
    case "singleDropdownWithSearch":
      return <SingleDropdownWithSearchHeader {...props} />;
    case "icons":
      return <IconsHeader {...props} />;
    default:
      return <TabbedAppletsHeader {...props} />;
  }
};

export default DesktopAppHeader;