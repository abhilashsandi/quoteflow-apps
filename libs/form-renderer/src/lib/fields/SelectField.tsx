import {
  FormField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'ui-components';
import type { FieldRendererProps } from '../field-renderer.types.js';

export function SelectField({
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
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={field.key} invalid={Boolean(error)} onBlur={onBlur}>
          <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {(field.options ?? []).map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}
