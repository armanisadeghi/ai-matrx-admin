import { cn } from "@/lib/utils";
import { SchemaField } from "@/constants/socket-constants";

export const getComponentProps = (field: SchemaField) => {
    const props: Record<string, any> = {};

    if (field.COMPONENT_PROPS) {
        for (const [key, value] of Object.entries(field.COMPONENT_PROPS)) {
            if (key === "className" && props.className) {
                props.className = cn(props.className, value as string);
            } else {
                props[key] = value;
            }
        }
    }

    return props;
};
