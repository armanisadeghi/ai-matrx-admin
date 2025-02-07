import { Switch, Label } from "@/components/ui";
import { withBrokerInput } from "../components/withBrokerInput";
import { cn } from "@/utils";

export const BrokerSwitch = withBrokerInput(({ 
  value, 
  onChange, 
  broker, 
  inputComponent 
}) => {
  const labelPosition = inputComponent.additional_params?.labelPosition || 'left';
  
  const switchElement = (
      <Switch
          checked={value === true || value === 'true'}
          onCheckedChange={onChange}
          className={inputComponent.classes}
      />
  );

  return (
      <div className="flex items-center justify-between gap-4">
          {labelPosition === 'left' ? (
              <>
                  <div className="flex-1">
                      <Label>{inputComponent.name}</Label>
                      {inputComponent.description && (
                          <p className="text-sm text-muted-foreground">
                              {inputComponent.description}
                          </p>
                      )}
                  </div>
                  {switchElement}
              </>
          ) : (
              <>
                  {switchElement}
                  <div className="flex-1">
                      <Label>{inputComponent.name}</Label>
                      {inputComponent.description && (
                          <p className="text-sm text-muted-foreground">
                              {inputComponent.description}
                          </p>
                      )}
                  </div>
              </>
          )}
      </div>
  );
});
