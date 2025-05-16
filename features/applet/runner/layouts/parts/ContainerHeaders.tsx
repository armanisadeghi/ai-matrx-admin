import React from "react";

interface ContainerHeaderProps {
  label: string;
  description: string;
  primaryColor?: string;
  accentColor?: string;
}

const ContainerHeaderLabel: React.FC<ContainerHeaderProps> = ({
  label,
  description,
  primaryColor = "gray",
  accentColor = "rose",
}) => {
  return (
    <div>
      <h3 className={`text-lg font-medium text-${accentColor}-500`}>{label}</h3>
      <p className={`text-sm text-${primaryColor}-500 dark:text-${primaryColor}-400`}>
        {description}
      </p>
    </div>
  );
};

export default ContainerHeaderLabel;