"use client";

import React from "react";
import OverlayController from "./OverlayController";
import dynamic from "next/dynamic";

const MessageActionsController = dynamic(
  () =>
    import("@/features/cx-conversation/components/MessageActionsController").then(
      (m) => ({ default: m.MessageActionsController }),
    ),
  { ssr: false },
);

export const ClientOverlayProvider: React.FC = () => {
  return (
    <>
      <OverlayController />
      <MessageActionsController />
    </>
  );
};

export default ClientOverlayProvider;