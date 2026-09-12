import type { PageConfig } from 'api-client';
import { resolveFieldComponent } from './field-registry.js';

export interface ConfigDrivenPageProps {
  config: PageConfig;
  values: Record<string, string>;
  errors?: Record<string, string>;
  onFieldChange: (fieldKey: string, value: string) => void;
  onFieldBlur?: (fieldKey: string) => void;
}

/**
 * Renders one carrier-config page (Sections -> Fields) purely from data — no page is ever
 * hand-coded per carrier. `config` comes from quoteflow-rating-service's
 * GET /quotes/:quoteId/schemas response (or, portal/state-resolved, from its compiled config
 * bundle — see the README).
 */
export function ConfigDrivenPage({
  config,
  values,
  errors,
  onFieldChange,
  onFieldBlur,
}: ConfigDrivenPageProps) {
  return (
    <div className="flex flex-col gap-8">
      {config.sections.map((section) => (
        <section key={section.key} className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">{section.title}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {section.fields.map((field) => {
              const FieldComponent = resolveFieldComponent(field.type);
              return (
                <FieldComponent
                  key={field.key}
                  field={field}
                  value={values[field.key] ?? ''}
                  error={errors?.[field.key]}
                  onChange={(value) => onFieldChange(field.key, value)}
                  onBlur={
                    onFieldBlur ? () => onFieldBlur(field.key) : undefined
                  }
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
