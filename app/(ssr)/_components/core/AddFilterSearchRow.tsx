import { TapTargetButtonGroup } from "./TapTargetButton";
import {
  PlusTapButton,
  ArrowDownUpTapButton,
  MaximizeTapButton,
  SettingsTapButton,
  SearchTapButton,
} from "@/components/icons/tap-buttons";

export default function AddFilterSearchRow() {
  return (
    <div className="flex items-center">
      <PlusTapButton />

      <TapTargetButtonGroup>
        <ArrowDownUpTapButton variant="group" />
        <MaximizeTapButton variant="group" />
        <SettingsTapButton variant="group" />
      </TapTargetButtonGroup>

      <SearchTapButton />
    </div>
  );
}
