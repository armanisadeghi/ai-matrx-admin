import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import {
  AnimationPreset,
  ComponentDensity,
} from "@/types/componentConfigTypes";
import { densityConfig, UnifiedLayoutProps } from "@/components/matrx/Entity";

export const formComponentAnimation = {
  none: {
    initial: {},
    animate: {},
    exit: {},
    transition: {},
  },
  subtle: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.15, ease: "easeOut" },
  },
  smooth: {
    initial: { opacity: 0, y: 5 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -5 },
    transition: { duration: 0.2, ease: "easeInOut" },
  },
  energetic: {
    initial: { opacity: 0, scale: 0.97, y: 3 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.97, y: -3 },
    transition: { type: "spring", stiffness: 400, damping: 30 },
  },
  feedback: {
    initial: { opacity: 0, x: -3 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 3 },
    transition: { type: "tween", duration: 0.15, ease: "easeOut" },
  },
  error: {
    initial: { opacity: 0, scale: 0.95 },
    animate: {
      opacity: 1,
      scale: 1,
      x: [0, -3, 3, -2, 2, 0],
    },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.3 },
  },
};

const spacingConfig = {
  compact: {
    padding: "py-0",
    paddingFloatingLabel: "pt-1.5",
  },
  normal: {
    padding: "py-1",
    paddingFloatingLabel: "pb-0.5 pt-2",
  },
  comfortable: {
    padding: "py-3",
    paddingFloatingLabel: "pb-3 pt-5",
  },
};

interface FormFieldMotionWrapperFinalProps {
  children: React.ReactNode;
  unifiedLayoutProps?: UnifiedLayoutProps;
  className?: string;
}

const FormFieldMotionWrapperFinal: React.FC<
  FormFieldMotionWrapperFinalProps
> = ({ children, unifiedLayoutProps, className = "" }) => {
  const dynamicStyleOptions = unifiedLayoutProps.dynamicStyleOptions;
  const densityStyles =
    spacingConfig[dynamicStyleOptions.density] || spacingConfig.normal;
  const animationPreset = dynamicStyleOptions.animationPreset || "smooth";
  const formStyleOptions =
    unifiedLayoutProps.dynamicLayoutOptions.formStyleOptions;
  const floatingLabel = formStyleOptions.floatingLabel ?? true;

  return (
    <div className="">
      <motion.div
        initial={formComponentAnimation[animationPreset].initial}
        animate={formComponentAnimation[animationPreset].animate}
        exit={formComponentAnimation[animationPreset].exit}
        transition={formComponentAnimation[animationPreset].transition}
        className={cn(
          densityStyles.padding,
          floatingLabel && densityStyles.paddingFloatingLabel,
          className
        )}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default FormFieldMotionWrapperFinal;
