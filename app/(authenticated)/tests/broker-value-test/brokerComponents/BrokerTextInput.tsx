import { Input, Label } from "@/components/ui";
import { withBrokerInput } from "../components/withBrokerInput";

export const BrokerTextInput = withBrokerInput(({ 
    value, 
    onChange, 
    name, 
    description 
  }) => {
    return (
      <>
        <Label>{name}</Label>
        <Input
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        />
        <p className="text-sm text-muted-foreground">{description}</p>
      </>
    );
  });
  
  // Usage:
//   <BrokerTextInput brokerId="user.firstName" />