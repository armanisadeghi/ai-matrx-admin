import type { ReactNode } from "react";

interface SimplePanelProps {
  intro?: string;
  children?: ReactNode;
}

export function SimplePanel({ intro, children }: SimplePanelProps) {
  return (
    <div className="flex flex-col gap-4 pt-2 text-[#e9edef]">
      {intro ? (
        <p className="text-[14px] leading-relaxed text-[#aebac1]">{intro}</p>
      ) : null}
      {children}
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  description?: string;
  defaultChecked?: boolean;
}

export function ToggleRow({
  label,
  description,
  defaultChecked,
}: ToggleRowProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg bg-[#202c33] px-4 py-3.5">
      <div className="min-w-0">
        <div className="text-[15px] text-[#e9edef]">{label}</div>
        {description ? (
          <div className="mt-0.5 text-[12.5px] text-[#8696a0]">
            {description}
          </div>
        ) : null}
      </div>
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-[#374248] transition checked:bg-[#25d366] relative
          before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition
          checked:before:translate-x-4"
      />
    </label>
  );
}

interface RowGroupProps {
  children: ReactNode;
}

export function RowGroup({ children }: RowGroupProps) {
  return (
    <div className="overflow-hidden rounded-lg bg-[#202c33] divide-y divide-[#2a3942]">
      {children}
    </div>
  );
}
