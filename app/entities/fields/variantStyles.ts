import { MatrxVariant } from "@/components/ui/types";
import { useMemo } from "react";

export const useVariantStyles = (variant: MatrxVariant) =>
  useMemo(
    () =>
      ({
        destructive: "border-destructive text-destructive",
        success: "border-success text-success",
        outline: "border-2",
        secondary: "bg-secondary text-secondary-foreground",
        ghost: "border-none bg-transparent",
        link: "text-primary underline-offset-4 hover:underline",
        primary: "bg-primary text-primary-foreground",
        default: "",
      }[variant]),
    [variant]
  );
