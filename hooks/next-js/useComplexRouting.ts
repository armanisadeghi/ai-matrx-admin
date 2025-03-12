import { useCallback } from "react";
import { useRouter } from "next/navigation";

interface UseComplexRoutingProps {
  /**
   * The base path pattern for the route
   * Use `:id` as a placeholder for dynamic segments
   * Examples: 
   * - "/chat/:id" 
   * - "/dashboard/preferences/:id"
   * - "/projects/:projectId/tasks/:taskId"
   */
  basePath: string;
}

/**
 * A generic routing hook that can be used for any route pattern
 */
export const useComplexRouting = ({ basePath }: UseComplexRoutingProps) => {
  const router = useRouter();
  
  /**
   * Navigate to a specific path
   * @param path The path to navigate to
   */
  const navigateTo = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router]
  );
  
  /**
   * Replace the current URL without adding to history
   * @param path The path to navigate to
   */
  const replacePath = useCallback(
    (path: string) => {
      router.replace(path);
    },
    [router]
  );
  
  /**
   * Navigate back in history
   */
  const goBack = useCallback(() => {
    router.back();
  }, [router]);
  
  /**
   * Navigate to a specific item using the base path pattern
   * @param id The ID to insert into the base path
   * @returns The full path after inserting the ID
   */
  const navigateToItem = useCallback(
    (id: string) => {
      const path = basePath.replace(/:id\b/, id);
      router.push(path);
      return path;
    },
    [router, basePath]
  );
  
  /**
   * Navigate to a specific item with multiple parameters
   * @param params Object containing parameter keys and values to insert into the path
   * @returns The full path after inserting all parameters
   */
  const navigateWithParams = useCallback(
    (params: Record<string, string>) => {
      let path = basePath;
      
      // Replace all :paramName patterns with corresponding values
      Object.entries(params).forEach(([key, value]) => {
        path = path.replace(new RegExp(`:${key}\\b`, 'g'), value);
      });
      
      router.push(path);
      return path;
    },
    [router, basePath]
  );

  return {
    navigateTo,
    replacePath,
    goBack,
    navigateToItem,
    navigateWithParams,
    basePath,
  };
};

export type ComplexRoutingResult = ReturnType<typeof useComplexRouting>;
export default useComplexRouting;