"use client"

import { useContext, useSyncExternalStore } from "react"
import { ReactReduxContext } from "react-redux"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

type ThemeMode = "light" | "dark"

// `<Sonner />` is mounted in `app/layout.tsx` OUTSIDE `<StoreProvider>`, so a
// plain `useAppSelector` would throw. Subscribe through the Redux store via
// `ReactReduxContext` when available, and fall back to a DOM class read
// otherwise — matches the pre-Phase-1.C external-store shim behavior.
interface ThemeRootSlice {
  theme?: { mode?: ThemeMode }
}

function readModeFromDOM(): ThemeMode {
  if (typeof document === "undefined") return "dark"
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

function useThemeMode(): ThemeMode {
  const ctx = useContext(ReactReduxContext)
  return useSyncExternalStore<ThemeMode>(
    (onStoreChange) => {
      if (!ctx?.store) return () => {}
      return ctx.store.subscribe(onStoreChange)
    },
    () => {
      if (ctx?.store) {
        const state = ctx.store.getState() as ThemeRootSlice
        return state.theme?.mode ?? readModeFromDOM()
      }
      return readModeFromDOM()
    },
    () => "dark",
  )
}

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useThemeMode()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
