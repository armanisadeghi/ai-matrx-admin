import { Switch, Label } from "@/components/ui";
import { withBrokerInput, withBrokerCustomInput } from "../components/withBrokerInput";


export const BrokerSwitch = withBrokerInput(({ 
  value, 
  onChange, 
  inputComponent 
}) => {
  
  return (
      <div className="flex items-center gap-2">
          <Switch
              checked={value === true || value === 'true'}
              onCheckedChange={onChange}
          />
      </div>
  );
});



export const BrokerCustomSwitch = withBrokerCustomInput(({ 
  value, 
  onChange, 
  broker, 
  inputComponent 
}) => {
  const labelPosition = inputComponent.additionalParams?.labelPosition || 'left';
  
  const switchElement = (
      <Switch
          checked={value === true || value === 'true'}
          onCheckedChange={onChange}
          className={inputComponent.componentClassName}
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
