import { useState } from "react";
import { Label, Input } from "@/components/ui";
import { cn } from "@/utils";
import { withBrokerInput } from "../components/withBrokerInput";


export const BrokerInput = withBrokerInput(({ 
  value, 
  onChange, 
  broker, 
  inputComponent 
}) => {
  const [error, setError] = useState<string | null>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      
      // Handle validation if specified
      if (inputComponent.additional_params?.validation) {
          const { pattern, message } = inputComponent.additional_params.validation;
          if (pattern && !new RegExp(pattern).test(newValue)) {
              setError(message || 'Invalid input');
          } else {
              setError(null);
          }
      }
      
      onChange(newValue);
  };

  return (
      <div className="space-y-1">
          <Label>{inputComponent.name}</Label>
          <Input
              value={value}
              onChange={handleChange}
              type={inputComponent.additional_params?.type || 'text'}
              placeholder={inputComponent.additional_params?.placeholder}
              className={cn(
                  error && "border-red-500",
                  inputComponent.classes
              )}
          />
          {error && (
              <p className="text-sm text-red-500">{error}</p>
          )}
          {inputComponent.description && (
              <p className="text-sm text-muted-foreground">
                  {inputComponent.description}
              </p>
          )}
      </div>
  );
});
