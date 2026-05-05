"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/styles/themes/utils";
import type { ModalNavContext } from "../../../types";

interface AccountPanelProps {
  ctx: ModalNavContext;
}

export function AccountPanel({ ctx }: AccountPanelProps) {
  return (
    <div className="flex flex-col gap-5">
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
        <Row label="Log out" destructive />
      </Card>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg bg-muted">{children}</div>
  );
}

function Divider() {
  return <div className="ml-4 h-px bg-border" />;
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
      className="flex w-full items-center justify-between px-4 py-3.5 text-left text-[15px] hover:bg-accent"
    >
      <span
        className={cn(
          destructive
            ? "text-rose-500"
            : emphasis
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-foreground",
        )}
      >
        {label}
      </span>
      {onClick ? (
        <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
      ) : null}
    </button>
  );
}
