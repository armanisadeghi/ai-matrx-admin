"use client";

/**
 * One Name field for a thing with two names (A22): the LABEL people read
 * ("Normal Text"), shown exactly as typed, and the KEY code uses
 * (`normal_text`), shown on one fixed-height line under it. The field never
 * shows the key in place of the name. The rules for deriving the key live in
 * `variables-management/variable-name-edit.ts`; this is the field only.
 *
 * Used by the agent builder's variable editor and context-policy editor.
 */
import { ProInput } from "@/components/official/ProInput";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface LabelKeyFieldProps {
  id?: string;
  /** The field's own label. */
  title?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** The key to show under the field; nothing shown when empty. */
  keyText: string;
  /** Words before the key, e.g. "In messages". */
  keyPrefix: string;
  /** How the key is written, e.g. `{{key}}`. */
  formatKey?: (key: string) => string;
  /** Shown in place of the key line, in the destructive color. */
  error?: string | null;
  /** Shown in place of the key line, muted (e.g. a rule hint). */
  hint?: string | null;
  /** A "Change" action beside the key (an explicit key edit). */
  onChangeKey?: () => void;
  disabled?: boolean;
  placeholder?: string;
  titleClassName?: string;
}

export function LabelKeyField({
  id,
  title = "Name",
  value,
  onChange,
  onBlur,
  keyText,
  keyPrefix,
  formatKey = (k) => k,
  error,
  hint,
  onChangeKey,
  disabled,
  placeholder,
  titleClassName = "text-sm font-medium",
}: LabelKeyFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className={titleClassName}>
        {title}
      </Label>
      <ProInput
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        className={error ? "border-destructive" : ""}
        style={{ fontSize: "16px" }}
      />
      {/* ONE fixed-height status line: states that appear and vanish on blur
          must never move the controls below (a click would land on nothing). */}
      {!disabled && (
        <p
          className={cn(
            "h-4 truncate type-secondary leading-4",
            error ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {error ? (
            error
          ) : hint ? (
            hint
          ) : keyText ? (
            <>
              {keyPrefix}{" "}
              <code className="font-mono text-foreground">{formatKey(keyText)}</code>
              {onChangeKey && (
                <button
                  type="button"
                  onClick={onChangeKey}
                  className="ml-2 underline underline-offset-2 hover:text-foreground"
                >
                  Change
                </button>
              )}
            </>
          ) : null}
        </p>
      )}
    </div>
  );
}
