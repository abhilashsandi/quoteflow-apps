import { FormField, Input, SsnInput } from 'ui-components';
import type { FieldRendererProps } from '../field-renderer.types.js';

/** Also used for date and phone fields — the widget is a plain text input in both cases;
 * phone differs only in which validator runs against the value (see libs/form-renderer's
 * README on why field.type and field.validator are orthogonal). ssn is the one exception: it
 * gets a dedicated masked/formatted widget (SsnInput) instead of a plain text input. */
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
      {field.validator === 'ssn' ? (
        <SsnInput
          id={field.key}
          value={value}
          invalid={Boolean(error)}
          onChange={onChange}
          onBlur={onBlur}
        />
      ) : (
        <Input
          id={field.key}
          type={field.type === 'date' ? 'date' : 'text'}
          value={value}
          invalid={Boolean(error)}
          onChange={(event) => onChange(event.currentTarget.value)}
          onBlur={onBlur}
        />
      )}
    </FormField>
  );
}
