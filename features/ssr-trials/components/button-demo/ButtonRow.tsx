import { TapTargetButtonGroup } from "@/components/icons/TapTargetButton";
import {
  BellTapButton,
  PlusTapButton,
  ArrowDownUpTapButton,
  MaximizeTapButton,
  SettingsTapButton,
  SearchTapButton,
  UploadTapButton,
  UndoTapButton,
  RedoTapButton,
  CopyTapButton,
  TrashTapButton,
} from "@/components/icons/tap-buttons";

export default function ButtonRow() {
  return (
    <div className="flex items-center">
      <BellTapButton />

      <TapTargetButtonGroup>
        <PlusTapButton variant="group" />
        <ArrowDownUpTapButton variant="group" />
        <MaximizeTapButton variant="group" />
        <SettingsTapButton variant="group" />
        <SearchTapButton variant="group" />
      </TapTargetButtonGroup>

      <UploadTapButton />

      <TapTargetButtonGroup>
        <UndoTapButton variant="group" />
        <RedoTapButton variant="group" />
        <CopyTapButton variant="group" />
        <TrashTapButton variant="group" />
      </TapTargetButtonGroup>
    </div>
  );
}
