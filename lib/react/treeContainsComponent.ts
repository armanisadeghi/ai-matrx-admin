import * as React from "react";

/**
 * Returns true if `Component` appears anywhere in the React element tree under `node`.
 * Used to detect optional a11y children (e.g. DialogDescription) without rendering duplicates.
 */
export function treeContainsComponent(
  node: React.ReactNode,
  Component: React.ElementType,
): boolean {
  return React.Children.toArray(node).some((child) => {
    if (!React.isValidElement(child)) return false;
    if (child.type === Component) return true;
    const props = child.props as { children?: React.ReactNode };
    if (props.children != null) {
      return treeContainsComponent(props.children, Component);
    }
    return false;
  });
}
