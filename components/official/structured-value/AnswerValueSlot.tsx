"use client";

// components/official/structured-value/AnswerValueSlot.tsx
//
// The chat package's `AnswerValueView` slot (providers/chatUiRegistrationBase.ts
// registers it at shell startup). Text and scalars draw at once through
// `AnswerTextView`; a structured value goes through the kind front door
// (`KindValueFrontDoor`, an existing lazy edge), so the kind stack
// (KindInstanceRender → the content-ir component registry) loads when a value
// is actually shown — never with the shell on every route.

import type { AnswerValueViewProps } from "@/components/official/structured-value/AnswerValueView";
import { AnswerTextView } from "@ai-matrx/chat/window-panels/windows/text-review/AnswerTextView";
import { KindValueFrontDoor } from "@/components/official/structured-value/KindValueFrontDoor";

export function AnswerValueSlot(props: AnswerValueViewProps) {
  const { value } = props;
  if (value != null && typeof value === "object") return <KindValueFrontDoor {...props} />;
  return (
    <AnswerTextView
      value={value}
      text={props.text}
      density={props.density}
      emptyText={props.emptyText}
    />
  );
}

export default AnswerValueSlot;
