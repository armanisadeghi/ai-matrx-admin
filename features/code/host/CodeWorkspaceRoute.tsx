"use client";

import React from "react";
import { CodeWorkspace, type CodeWorkspaceProps } from "../CodeWorkspace";

/**
 * Full-viewport host — for /code and similar pages. Consumers can still pass
 * any adapter/slot they like. The container fills the available space inside
 * the authenticated shell.
 */
export const CodeWorkspaceRoute: React.FC<CodeWorkspaceProps> = (props) => {
  return (
    <div className="h-[calc(100vh-var(--shell-offset,0px))] w-full">
      <CodeWorkspace {...props} />
    </div>
  );
};

export default CodeWorkspaceRoute;
