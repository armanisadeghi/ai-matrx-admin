import { useCallback } from "react";
import { useRouter } from "next/navigation";

interface UseGenericRoutingProps {
  /**
   * Base path for the route (e.g., "/chat", "/dashboard/preferences")
   * Should include leading slash but not trailing slash
   */
  basePath: string;
}

/**
 * A generic routing hook that can be used with any route structure
 * @param basePath The base path for the route (e.g., "/chat", "/dashboard/preferences")
 */
export const useGenericRouting = ({ basePath }: UseGenericRoutingProps) => {
  const router = useRouter();
  
  // Ensure basePath is properly formatted (has leading slash, no trailing slash)
  const normalizedBasePath = useCallback(() => {
    let path = basePath;
    if (!path.startsWith("/")) {
      path = `/${path}`;
    }
    if (path.endsWith("/")) {
      path = path.slice(0, -1);
    }
    return path;
  }, [basePath]);
  
  /**
   * Navigate to the base path
   */
  const navigateToBase = useCallback(() => {
    router.push(normalizedBasePath());
  }, [router, normalizedBasePath]);
  
  /**
   * Navigate to a specific item under the base path
   * @param itemId The ID of the item to navigate to
   */
  const navigateToItem = useCallback(
    (itemId: string) => {
      router.push(`${normalizedBasePath()}/${itemId}`);
    },
    [router, normalizedBasePath]
  );
  
  /**
   * Navigate to a nested path under the base path
   * @param nestedPath The nested path (without leading slash)
   */
  const navigateToNested = useCallback(
    (nestedPath: string) => {
      const cleanNestedPath = nestedPath.startsWith("/") ? nestedPath.slice(1) : nestedPath;
      router.push(`${normalizedBasePath()}/${cleanNestedPath}`);
    },
    [router, normalizedBasePath]
  );
  
  /**
   * Navigate to a specific item with a nested path
   * @param itemId The ID of the item
   * @param nestedPath The nested path after the item ID
   */
  const navigateToItemNested = useCallback(
    (itemId: string, nestedPath: string) => {
      const cleanNestedPath = nestedPath.startsWith("/") ? nestedPath.slice(1) : nestedPath;
      router.push(`${normalizedBasePath()}/${itemId}/${cleanNestedPath}`);
    },
    [router, normalizedBasePath]
  );
  
  /**
   * Navigate back in history
   */
  const goBack = useCallback(() => {
    router.back();
  }, [router]);
  
  /**
   * Replace the current URL without adding to history
   * @param path The full path to navigate to
   */
  const replacePath = useCallback(
    (path: string) => {
      router.replace(path);
    },
    [router]
  );

  return {
    navigateToBase,
    navigateToItem,
    navigateToNested,
    navigateToItemNested,
    goBack,
    replacePath,
    basePath: normalizedBasePath,
  };
};

export type GenericRoutingResult = ReturnType<typeof useGenericRouting>;
export default useGenericRouting;