import * as React from 'react';
import { Label } from '../atoms/Label.js';
import { cn } from '../lib/utils.js';

export interface FormFieldProps {
  htmlFor: string;
  label: string;
  required?: boolean;
  error?: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Layout-only wrapper (Label + control + error/description text) used by
 * libs/form-renderer's component-type registry — it doesn't know or care what kind of
 * control it wraps (Input, Select, Checkbox, ...).
 */
export function FormField({
  htmlFor,
  label,
  required,
  error,
  description,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-destructive ml-0.5">*</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : description ? (
        <p className="text-muted-foreground text-xs">{description}</p>
      ) : null}
    </div>
  );
}
