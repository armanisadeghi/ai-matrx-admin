"use client";

import { ChevronRight } from "lucide-react";
import type { ModalNavContext } from "../../../types";

interface AccountPanelProps {
  ctx: ModalNavContext;
}

export function AccountPanel({ ctx }: AccountPanelProps) {
  return (
    <div className="flex flex-col gap-5 pt-2">
      <Card>
        <Row
          label="Security notifications"
          onClick={() => ctx.push("security-notifications")}
        />
      </Card>

      <Card>
        <Row label="How to delete account" emphasis />
      </Card>

      <Card>
        <Row label="Request account info" />
        <Divider />
        <Row label="Log out" emphasis destructive />
      </Card>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg bg-[#202c33]">{children}</div>
  );
}

function Divider() {
  return <div className="ml-4 h-px bg-[#2a3942]" />;
}

function Row({
  label,
  onClick,
  emphasis,
  destructive,
}: {
  label: string;
  onClick?: () => void;
  emphasis?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between px-4 py-3.5 text-left text-[15px] hover:bg-[#2a3942]"
    >
      <span
        className={
          destructive
            ? "text-[#f15c6d]"
            : emphasis
              ? "text-[#25d366]"
              : "text-[#e9edef]"
        }
      >
        {label}
      </span>
      {onClick ? (
        <ChevronRight className="h-4 w-4 text-[#8696a0]" aria-hidden />
      ) : null}
    </button>
  );
}
