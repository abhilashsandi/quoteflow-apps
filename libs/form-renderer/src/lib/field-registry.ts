import type { FieldComponent } from './field-renderer.types.js';
import { SelectField } from './fields/SelectField.js';
import { TextField } from './fields/TextField.js';

/**
 * Keyed by `field.type` ('text' | 'select' | 'date'), which decides *which widget* renders —
 * not `field.validator` ('ssn' | 'phone' | ...), which decides what checks the value on
 * blur/submit (wired in milestone 4 against quoteflow-rating-service's validator bundle).
 * The two are orthogonal: an ssn field is a `text`-type field with an `ssn` validator, so it
 * renders via the same TextField as any other text input.
 */
export const fieldComponentRegistry: Record<string, FieldComponent> = {
  text: TextField,
  date: TextField,
  select: SelectField,
};

export function resolveFieldComponent(type: string): FieldComponent {
  const component = fieldComponentRegistry[type];
  if (!component) {
    throw new Error(`No field component registered for type "${type}"`);
  }
  return component;
}
