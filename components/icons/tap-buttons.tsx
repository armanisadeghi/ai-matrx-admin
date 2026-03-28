import {
  TapTargetButton,
  TapTargetButtonTransparent,
  TapTargetButtonSolid,
  TapTargetButtonForGroup,
} from "@/components/icons/TapTargetButton";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

type Variant = "glass" | "transparent" | "solid" | "group";

interface TapButtonProps {
  variant?: Variant;
  onClick?: () => void;
  as?: "button" | "label";
  htmlFor?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
  strokeWidth?: number;
  // Solid-variant color overrides — only used when variant="solid"
  bgColor?: string;
  iconColor?: string;
  hoverBgColor?: string;
}

// ---------------------------------------------------------------------------
// Variant resolver — maps a variant string to the correct wrapper component.
// Runs at build/server time so there's zero client cost.
// ---------------------------------------------------------------------------

function Wrap({
  variant = "glass",
  children,
  ...props
}: TapButtonProps & { children: React.ReactNode }) {
  switch (variant) {
    case "transparent":
      return (
        <TapTargetButtonTransparent {...props}>
          {children}
        </TapTargetButtonTransparent>
      );
    case "solid":
      return <TapTargetButtonSolid {...props}>{children}</TapTargetButtonSolid>;
    case "group":
      return (
        <TapTargetButtonForGroup {...props}>{children}</TapTargetButtonForGroup>
      );
    default:
      return <TapTargetButton {...props}>{children}</TapTargetButton>;
  }
}

// ---------------------------------------------------------------------------
// Pre-composed buttons — one import, one tag, zero configuration needed.
// Default variant is "glass". Override with variant="transparent" etc.
// ---------------------------------------------------------------------------

export function MenuTapButton(props: TapButtonProps) {
  return (
    <Wrap ariaLabel="Menu" strokeWidth={1.75} {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
      />
    </Wrap>
  );
}

export function PlusTapButton(props: TapButtonProps) {
  return (
    <Wrap ariaLabel="Add" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.5v15m7.5-7.5h-15"
      />
    </Wrap>
  );
}

export function SearchTapButton(props: TapButtonProps) {
  return (
    <Wrap ariaLabel="Search" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </Wrap>
  );
}

export function SettingsTapButton(props: TapButtonProps) {
  return (
    <Wrap ariaLabel="Settings" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
    </Wrap>
  );
}

export function MaximizeTapButton(props: TapButtonProps) {
  return (
    <Wrap ariaLabel="Fullscreen" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
      />
    </Wrap>
  );
}

export function ArrowDownUpTapButton(props: TapButtonProps) {
  return (
    <Wrap ariaLabel="Sort" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v10.5"
      />
    </Wrap>
  );
}

export function BellTapButton(props: TapButtonProps) {
  return (
    <Wrap ariaLabel="Notifications" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </Wrap>
  );
}

export function UploadTapButton(props: TapButtonProps) {
  return (
    <Wrap ariaLabel="Upload" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
      />
    </Wrap>
  );
}

export function UndoTapButton(props: TapButtonProps) {
  return (
    <Wrap ariaLabel="Undo" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10h10a8 8 0 018 8v2M3 10l6 6M3 10l6-6"
      />
    </Wrap>
  );
}

export function RedoTapButton(props: TapButtonProps) {
  return (
    <Wrap ariaLabel="Redo" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"
      />
    </Wrap>
  );
}

export function CopyTapButton(props: TapButtonProps) {
  return (
    <Wrap ariaLabel="Copy" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </Wrap>
  );
}

export function TrashTapButton(props: TapButtonProps) {
  return (
    <Wrap ariaLabel="Delete" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </Wrap>
  );
}

export function ChevronLeftTapButton(props: TapButtonProps) {
  return (
    <Wrap ariaLabel="Back" strokeWidth={1.75} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
    </Wrap>
  );
}

export function PanelLeftTapButton(props: TapButtonProps) {
  return (
    <Wrap ariaLabel="Toggle sidebar" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm6-2v18"
      />
    </Wrap>
  );
}

export function PanelRightTapButton(props: TapButtonProps) {
  return (
    <Wrap ariaLabel="Toggle sidebar" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12-2v18"
      />
    </Wrap>
  );
}

export function SquarePenTapButton(props: TapButtonProps) {
  return (
    <Wrap ariaLabel="New chat" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5l3 3L12 15l-4 1 1-4 9.5-9.5"
      />
    </Wrap>
  );
}

export function XTapButton(props: TapButtonProps) {
  return (
    <Wrap ariaLabel="Close" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </Wrap>
  );
}

export function FilterTapButton(props: TapButtonProps) {
  return (
    <Wrap ariaLabel="Filter" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
      />
    </Wrap>
  );
}

export function PlayTapButton(props: TapButtonProps) {
  return (
    <Wrap ariaLabel="Play" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"
      />
    </Wrap>
  );
}

export function PauseTapButton(props: TapButtonProps) {
  return (
    <Wrap ariaLabel="Pause" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 5.25v13.5m-7.5-13.5v13.5"
      />
    </Wrap>
  );
}

export function StopTapButton(props: TapButtonProps) {
  return (
    <Wrap ariaLabel="Stop" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z"
      />
    </Wrap>
  );
}

export function Volume2TapButton(props: TapButtonProps) {
  return (
    <Wrap ariaLabel="Speaker" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25h2.24z"
      />
    </Wrap>
  );
}

export function ArrowUpTapButton(props: TapButtonProps) {
  return (
    <Wrap ariaLabel="Send" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 19V5m-7 7 7-7 7 7"
      />
    </Wrap>
  );
}

export function MicTapButton(props: TapButtonProps) {
  return (
    <Wrap ariaLabel="Start recording" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
      />
    </Wrap>
  );
}

export function MicOffTapButton(props: TapButtonProps) {
  return (
    <Wrap ariaLabel="Stop recording" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3zM2.25 2.25l19.5 19.5"
      />
    </Wrap>
  );
}

export function BugTapButton(props: TapButtonProps) {
  return (
    <Wrap ariaLabel="Debug" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 12.75c2.485 0 4.5-2.015 4.5-4.5S14.485 3.75 12 3.75 7.5 5.765 7.5 8.25s2.015 4.5 4.5 4.5z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 8.25H3.75m16.5 0H16.5m-9 6H3.75m16.5 0H16.5M12 12.75v8.25m-4.5-4.5H3.75m16.5 0H16.5"
      />
    </Wrap>
  );
}

export function Settings2TapButton(props: TapButtonProps) {
  return (
    <Wrap ariaLabel="Settings" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </Wrap>
  );
}
