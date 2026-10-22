"use client";

// features/visual-map-lab/LabError.tsx — an error in the lab's words, with the Alchemy menu on its line.

import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";

export function LabError({ message }: { message: string }) {
  return (
    <span className="type-secondary text-destructive">
      {message}
      <ErrorAlchemyMenu error={message} />
    </span>
  );
}
