import type { PageConfig } from 'api-client';
import { useState } from 'react';
import { resolveFieldComponent } from './field-registry.js';
import { useValidatorRunner } from './useValidatorRunner.js';

export interface ConfigDrivenPageProps {
  config: PageConfig;
  values: Record<string, string>;
  /** Server-reported errors (e.g. from a failed PATCH) — take precedence over client-side ones. */
  errors?: Record<string, string>;
  onFieldChange: (fieldKey: string, value: string) => void;
  onFieldBlur?: (fieldKey: string) => void;
  /**
   * quoteflow-rating-service's base URL. When set, blurring a field with a `validator` name
   * dynamic-imports that validator from the service's compiled bundle (Pattern 2) and runs it
   * client-side, ahead of the server-side re-validation that also always happens on submit.
   * Omit to skip client-side validation.
   */
  ratingServiceBaseUrl?: string;
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
  ratingServiceBaseUrl,
}: ConfigDrivenPageProps) {
  const { validate } = useValidatorRunner(ratingServiceBaseUrl);
  const [clientErrors, setClientErrors] = useState<
    Record<string, string | undefined>
  >({});

  async function handleFieldBlur(
    fieldKey: string,
    validatorName: string | undefined,
  ): Promise<void> {
    onFieldBlur?.(fieldKey);
    if (!validatorName) return;
    const result = await validate(validatorName, values[fieldKey] ?? '');
    setClientErrors((prev) => ({
      ...prev,
      [fieldKey]: result.valid ? undefined : result.message,
    }));
  }

  return (
    <div className="flex flex-col gap-8">
      {config.sections.map((section) => (
        <section key={section.key} className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">{section.title}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {section.fields.map((field) => {
              const FieldComponent = resolveFieldComponent(field.type);
              const error = errors?.[field.key] ?? clientErrors[field.key];
              return (
                <FieldComponent
                  key={field.key}
                  field={field}
                  value={values[field.key] ?? ''}
                  error={error}
                  onChange={(value) => onFieldChange(field.key, value)}
                  onBlur={() =>
                    void handleFieldBlur(field.key, field.validator)
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
