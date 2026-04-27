"use client";

import React from "react";
import { ENTITY_FIELD_COMPONENTS } from "./field-components/field-component-registries";
import FormFieldMotionWrapper from "@/components/matrx/ArmaniForm/field-components/wrappers/FormFieldMotionWrapper";
import type { EntityBaseFieldProps } from "./entityBaseFieldProps";

export type { EntityBaseFieldProps } from "./entityBaseFieldProps";

const EntityBaseField = ({
  entityKey,
  dynamicFieldInfo,
  value,
  onChange,
  density = "normal",
  animationPreset = "subtle",
  size = "default",
  variant = "default",
  floatingLabel = true,
  disabled = false,
  className,
}: EntityBaseFieldProps) => {
  const Component = ENTITY_FIELD_COMPONENTS[dynamicFieldInfo.defaultComponent];
  const valueOrDefault = value ?? dynamicFieldInfo.defaultValue;
  const customProps = dynamicFieldInfo.componentProps as Record<
    string,
    unknown
  >;
  const isDisabled = disabled === true || customProps?.disabled === true;

  return (
    <FormFieldMotionWrapper
      animationPreset={animationPreset}
      density={density}
      floatingLabel={floatingLabel}
      className={className}
    >
      <Component
        entityKey={entityKey}
        dynamicFieldInfo={dynamicFieldInfo}
        value={valueOrDefault}
        onChange={onChange}
        density={density}
        animationPreset={animationPreset}
        size={size}
        variant={variant}
        floatingLabel={floatingLabel}
        disabled={isDisabled}
      />
    </FormFieldMotionWrapper>
  );
};

EntityBaseField.displayName = "EntityBaseField";

export default EntityBaseField;
