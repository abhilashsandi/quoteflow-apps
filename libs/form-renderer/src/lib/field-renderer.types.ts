import type { FieldConfig } from 'api-client';
import type { JSX } from 'react';

export interface FieldRendererProps {
  field: FieldConfig;
  /** Current value from the quote session (see libs/state's useQuoteSession, milestone 5). */
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

export type FieldComponent = (props: FieldRendererProps) => JSX.Element;
