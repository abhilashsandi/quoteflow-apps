'use server';

import { createRatingServiceClient, type JsonPatchOp } from 'api-client';
import { redirect } from 'next/navigation';
import {
  ACME_CARRIER_CODE,
  BFF_GATEWAY_URL,
  GAQ_DRIVER_FIELDS,
  GAQ_VEHICLE_FIELDS,
  VANTAGE_CARRIER_CODE,
} from '../../../lib/config';

function readField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function toOps(
  formData: FormData,
  pageKey: string,
  fields: readonly string[],
): JsonPatchOp[] {
  return fields.map((fieldKey) => ({
    op: 'add',
    path: `/${pageKey}/${fieldKey}`,
    value: readField(formData, fieldKey),
  }));
}

/**
 * GaQ's single submit: rates both carriers from one form. Server-only — the browser never
 * calls bff-gateway directly here, same as every other quote read/write in this app (see
 * quoteflow-apps' CLAUDE.md rule 1); this just runs that call from the Next.js server instead
 * of the browser, mirroring the already-proven pattern in `lib/flags.ts`'s `getFlags()`.
 */
export async function submitGaq(formData: FormData): Promise<void> {
  const client = createRatingServiceClient(BFF_GATEWAY_URL);

  const acmeCreated = await client.createQuote(ACME_CARRIER_CODE);
  const vantageCreated = await client.createQuote(VANTAGE_CARRIER_CODE);
  if (!acmeCreated.success || !vantageCreated.success) {
    redirect(
      '/quote/start?message=' +
        encodeURIComponent(
          'Something went wrong starting your quote. Please try again.',
        ),
    );
  }

  const driverOps = toOps(formData, 'driver-info', GAQ_DRIVER_FIELDS);

  const acmePatch = await client.patchQuote(
    acmeCreated.data.quoteId,
    driverOps,
  );
  if (!acmePatch.success) {
    redirectWithFieldError('Acme Insurance', acmePatch.error.details);
  }

  const vantagePatch = await client.patchQuote(vantageCreated.data.quoteId, [
    ...driverOps,
    ...toOps(formData, 'vehicle-info', GAQ_VEHICLE_FIELDS),
  ]);
  if (!vantagePatch.success) {
    redirectWithFieldError('Vantage Direct', vantagePatch.error.details);
  }

  redirect(
    `/quote/compare?acme=${acmeCreated.data.quoteId}&vantage=${vantageCreated.data.quoteId}`,
  );
}

function redirectWithFieldError(carrierName: string, details: unknown): never {
  const { fieldKey, message } = (details ?? {}) as {
    fieldKey?: string;
    message?: string;
  };
  const text = `${carrierName}: ${message ?? `Please check the "${fieldKey ?? 'form'}" field.`}`;
  redirect(
    `/quote/start?message=${encodeURIComponent(text)}&field=${fieldKey ?? ''}`,
  );
}
