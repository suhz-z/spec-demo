"use client";

import { useId, type ComponentPropsWithoutRef, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export type CheckboxProps = Omit<ComponentPropsWithoutRef<"input">, "id" | "type"> & {
  id?: string;
  label: ReactNode;
  hint?: string;
  error?: string;
  containerClassName?: string;
};

export function Checkbox({
  id,
  label,
  hint,
  error,
  containerClassName,
  className,
  ...props
}: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("sg-field", containerClassName)}>
      <label className="sg-checkbox" htmlFor={inputId}>
        <input
          {...props}
          id={inputId}
          type="checkbox"
          className={className}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
        <span>{label}</span>
      </label>
      {hint ? (
        <p id={hintId} className="sg-field__hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="sg-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
