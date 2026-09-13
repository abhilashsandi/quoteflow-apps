'use client';

import * as React from 'react';
import { IMaskInput } from 'react-imask';
import { inputBaseClassName } from './Input.js';
import { cn } from '../lib/utils.js';

export interface SsnInputProps {
  id?: string;
  /** Set for a native, uncontrolled form (e.g. a Server Action's <form>) — the masked value
   * (with dashes) is what ends up in FormData under this name, same as a plain text input. */
  name?: string;
  /** Controlled mode, for a field wired into external state (e.g. ConfigDrivenPage). */
  value?: string;
  defaultValue?: string;
  required?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  /** Called with the masked value ("123-45-6789") on every accepted edit — controlled mode
   * only, mirrors Input's onChange but already formatted rather than a raw DOM event. */
  onChange?: (value: string) => void;
  onBlur?: () => void;
  className?: string;
}

/**
 * A Social Security Number input: formats digits into XXX-XX-XXXX as the user types (via
 * react-imask), and displays as a password field (dots) whenever it's not focused and has a
 * value — the same "hide sensitive PII at rest, reveal while editing" pattern banking/benefits
 * portals use for SSNs. Toggling `type` between "password" and "text" only changes how the
 * browser renders the field; the underlying value (and what a native form submits) is
 * unaffected, so this works identically in controlled and uncontrolled usage.
 */
export function SsnInput({
  id,
  name,
  value,
  defaultValue,
  required,
  invalid,
  disabled,
  onChange,
  onBlur,
  className,
}: SsnInputProps) {
  const [focused, setFocused] = React.useState(false);
  const [uncontrolledValue, setUncontrolledValue] = React.useState(
    defaultValue ?? '',
  );
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : uncontrolledValue;
  const masked = !focused && currentValue.replace(/\D/g, '').length > 0;

  return (
    <IMaskInput
      id={id}
      name={name}
      mask="000-00-0000"
      value={currentValue}
      unmask={false}
      onAccept={(next: string) => {
        if (!isControlled) setUncontrolledValue(next);
        onChange?.(next);
      }}
      type={masked ? 'password' : 'text'}
      inputMode="numeric"
      autoComplete="off"
      placeholder="000-00-0000"
      required={required}
      disabled={disabled}
      aria-invalid={invalid}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        onBlur?.();
      }}
      className={cn(inputBaseClassName, className)}
    />
  );
}
