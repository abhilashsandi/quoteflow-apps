import { Checkbox, FormField } from 'ui-components';
import type { FieldRendererProps } from '../field-renderer.types.js';

/** Boolean fields store 'true'/'false' as their string value — the same convention every
 * other field type uses (FieldRendererProps.value is always a string), just constrained to
 * two values instead of free text. */
export function CheckboxField({
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
      <Checkbox
        id={field.key}
        checked={value === 'true'}
        onCheckedChange={(checked) =>
          onChange(checked === true ? 'true' : 'false')
        }
        onBlur={onBlur}
      />
    </FormField>
  );
}
