// brokerComponents\index.ts.tsx

import { BrokerCheckbox } from "./BrokerCheckbox";
import BrokerColorPicker from "./BrokerColorPicker";
import { BrokerCustomInput, BrokerInput } from "./BrokerInput";
import { BrokerNumberInput } from "./BrokerNumberInput";
import { BrokerNumberPicker } from "./BrokerNumberPicker";
import { BrokerRadioGroup } from "./BrokerRadioGroup";
import { BrokerCustomSelect, BrokerSelect } from "./BrokerSelect";
import { BrokerSlider } from "./BrokerSlider";
import { BrokerSwitch } from "./BrokerSwitch";
import BrokerTailwindColorPicker from "./BrokerTailwindColorPicker";
import BrokerTextarea from "./BrokerTextarea";
import BrokerTextareaGrow from "./BrokerTextareaGrow";
import BrokerTextArrayInput from "./BrokerTextArrayInput";

export const BROKER_COMPONENTS = {
    'BrokerInput': BrokerInput,
    'BrokerCustomInput': BrokerCustomInput,
    'BrokerSelect': BrokerSelect,
    'BrokerCustomSelect': BrokerCustomSelect,
    'BrokerSlider': BrokerSlider,
    'BrokerSwitch': BrokerSwitch,
    'BrokerCheckbox': BrokerCheckbox,
    'BrokerRadioGroup': BrokerRadioGroup,
    'BrokerTextarea': BrokerTextarea,
    'BrokerTextareaGrow': BrokerTextareaGrow,
    'BrokerNumberInput': BrokerNumberInput,
    'BrokerNumberPicker': BrokerNumberPicker,
    'BrokerTextArrayInput': BrokerTextArrayInput,
    'BrokerColorPicker': BrokerColorPicker,
    'BrokerTailwindColorPicker': BrokerTailwindColorPicker,
}

export type BrokerComponentType = keyof typeof BROKER_COMPONENTS;