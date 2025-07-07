import { cloneDeep } from "lodash";
import { InputMapping } from "@/lib/redux/workflow/types";


export function generateInputsFromDefinition(nodeDefinition: any): InputMapping[] {
    return nodeDefinition.inputs
        .filter((input: any) => input.input_type === "argument")
        .map((input: any) => {
            // Find the matching argument by name
            const matchingArg = nodeDefinition.arguments.find((arg: any) => arg.name === input.name);

            if (!matchingArg) {
                throw new Error(`No matching argument found for input: ${input.name}`);
            }

            return {
                type: matchingArg.ready === false && matchingArg.required === true ? "arg_mapping" : "arg_override",
                arg_name: matchingArg.name,
                default_value: cloneDeep(matchingArg.default_value.value),
                ready: matchingArg.ready,
                metadata: {
                    required: matchingArg.required,
                    data_type: matchingArg.data_type,
                    use_system_default: !matchingArg.required || matchingArg.ready,
                },
            };
        });
}

export function generateInputByName(nodeDefinition: any, argName: string): InputMapping {
    // Find the input with the matching name and input_type: "argument"
    const input = nodeDefinition.inputs.find((input: any) => input.name === argName && input.input_type === "argument");

    if (!input) {
        throw new Error(`No input found with name "${argName}" and input_type "argument"`);
    }

    // Find the matching argument by name
    const matchingArg = nodeDefinition.arguments.find((arg: any) => arg.name === argName);

    if (!matchingArg) {
        throw new Error(`No matching argument found for input: ${argName}`);
    }

    return {
        type: matchingArg.ready === false && matchingArg.required === true ? "arg_mapping" : "arg_override",
        arg_name: matchingArg.name,
        default_value: cloneDeep(matchingArg.default_value.value),
        ready: matchingArg.ready,
        metadata: {
            required: matchingArg.required,
            data_type: matchingArg.data_type,
            use_system_default: !matchingArg.required || matchingArg.ready,
        },
    };
}

export function generateInputsByNames(nodeDefinition: any, argNames: string[]): InputMapping[] {
    // Return empty array if argNames is empty
    if (!argNames || argNames.length === 0) {
        return [];
    }

    return nodeDefinition.inputs
        .filter((input: any) => input.input_type === "argument" && argNames.includes(input.name))
        .map((input: any) => {
            // Find the matching argument by name
            const matchingArg = nodeDefinition.arguments.find((arg: any) => arg.name === input.name);

            if (!matchingArg) {
                // Skip if no matching argument is found
                return null;
            }

            return {
                type: matchingArg.ready === false && matchingArg.required === true ? "arg_mapping" : "arg_override",
                arg_name: matchingArg.name,
                default_value: cloneDeep(matchingArg.default_value.value),
                ready: matchingArg.ready,
                metadata: {
                    required: matchingArg.required,
                    data_type: matchingArg.data_type,
                    use_system_default: !matchingArg.required || matchingArg.ready,
                },
            };
        })
        .filter((mapping: InputMapping | null): mapping is InputMapping => mapping !== null);
}
