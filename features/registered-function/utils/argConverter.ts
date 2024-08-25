import {FlexRef} from "@/types/FlexRef";
import {ArgType} from "@/types/argTypes";


export function extractArgIds(arg: FlexRef<ArgType[]>): string[] {
    if (typeof arg === 'string') {
        return [arg];
    }

    if (Array.isArray(arg)) {
        if (typeof arg[0] === 'string') {
            return arg as string[];
        } else {
            return (arg as Partial<ArgType>[]).map(a => a.id!);
        }
    }

    if (typeof arg === 'object' && arg !== null) {
        return [(arg as Partial<ArgType>).id!];
    }

    return [];
}
