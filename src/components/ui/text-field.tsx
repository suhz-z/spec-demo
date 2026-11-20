"use client";

import { useId, type ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";

export type TextFieldProps = Omit<ComponentPropsWithoutRef<"input">, "id"> & {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
};

export function TextField({
  id,
  label,
  hint,
  error,
  containerClassName,
  className,
  required,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("sg-field", containerClassName)}>
      <label className="sg-field__label" htmlFor={inputId}>
        {label}
        {required ? (
          <span aria-hidden="true" className="sg-muted">
            {" "}
            *
          </span>
        ) : null}
      </label>
      <input
        {...props}
        id={inputId}
        className={cn("sg-input", className)}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
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
