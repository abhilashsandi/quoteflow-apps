import { FormField, Input } from 'ui-components';
import type { FieldRendererProps } from '../field-renderer.types.js';

/** Also used for date, ssn, and phone fields — the widget is a plain text input in all cases;
 * ssn/phone differ only in which validator runs against the value (see libs/form-renderer's
 * README on why field.type and field.validator are orthogonal). */
export function TextField({
  field,
  value,
  error,
  onChange,
  onBlur,
}: FieldRendererProps) {
  return (
    <FormField
      htmlFor={field.key}
      label={field.label}
      required={field.required}
      error={error}
    >
      <Input
        id={field.key}
        type={field.type === 'date' ? 'date' : 'text'}
        value={value}
        invalid={Boolean(error)}
        onChange={(event) => onChange(event.currentTarget.value)}
        onBlur={onBlur}
      />
    </FormField>
  );
}
