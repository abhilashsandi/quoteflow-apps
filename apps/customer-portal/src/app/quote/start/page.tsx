import {
  AppShell,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SsnInput,
} from 'ui-components';
import { submitGaq } from './actions';

const YEARS = ['2026', '2025', '2024', '2023', '2022', '2021', '2020'];

interface QuoteStartPageProps {
  searchParams: Promise<{ message?: string; field?: string }>;
}

/**
 * GaQ (Get a Quote): fully server-rendered — a native <form> posting straight to a Server
 * Action (submitGaq), no client-side session store involved. It collects every field either
 * carrier's routeConfig needs (driver info + vehicle info) in one step, since it's rating both
 * Acme and Vantage from a single submission rather than walking a per-carrier page wizard —
 * see the plan's addendum for why. Validation errors come back from quoteflow-rating-service's
 * own server-side re-validation (never trust the client) via a redirect back here with a
 * message, not by re-posting the submitted values (keeps SSN etc. out of the URL).
 */
export default async function QuoteStartPage({
  searchParams,
}: QuoteStartPageProps) {
  const { message, field } = await searchParams;

  return (
    <AppShell
      brand="QuoteFlow"
      gradient
      footer="© Acme Insurance & Vantage Direct — fictional carriers, portfolio sample only"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold">
            Tell us about you and your vehicle
          </h1>
          <p className="text-muted-foreground text-sm">
            We&apos;ll rate this with both Acme Insurance and Vantage Direct so
            you can compare.
          </p>
        </div>

        {message ? (
          <p
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {message}
          </p>
        ) : null}

        <form action={submitGaq} className="flex flex-col gap-6">
          <Card className="p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle>Driver information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-0 sm:grid-cols-2">
              <FormField htmlFor="firstName" label="First name" required>
                <Input
                  id="firstName"
                  name="firstName"
                  required
                  invalid={field === 'firstName'}
                />
              </FormField>
              <FormField htmlFor="lastName" label="Last name" required>
                <Input
                  id="lastName"
                  name="lastName"
                  required
                  invalid={field === 'lastName'}
                />
              </FormField>
              <FormField htmlFor="dob" label="Date of birth" required>
                <Input
                  id="dob"
                  name="dob"
                  type="date"
                  required
                  invalid={field === 'dob'}
                />
              </FormField>
              <FormField htmlFor="ssn" label="Social Security Number" required>
                <SsnInput
                  id="ssn"
                  name="ssn"
                  required
                  invalid={field === 'ssn'}
                />
              </FormField>
              <FormField htmlFor="phone" label="Phone number" required>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  invalid={field === 'phone'}
                />
              </FormField>
              <FormField
                htmlFor="maritalStatus"
                label="Marital status"
                required
              >
                <Select name="maritalStatus" defaultValue="single" required>
                  <SelectTrigger
                    id="maritalStatus"
                    invalid={field === 'maritalStatus'}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </CardContent>
          </Card>

          <Card className="p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle>Vehicle information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-0 sm:grid-cols-2">
              <FormField
                htmlFor="vin"
                label="VIN"
                required
                className="sm:col-span-2"
                description="17 characters, no I/O/Q"
              >
                <Input id="vin" name="vin" required invalid={field === 'vin'} />
              </FormField>
              <FormField htmlFor="make" label="Make" required>
                <Input
                  id="make"
                  name="make"
                  required
                  invalid={field === 'make'}
                />
              </FormField>
              <FormField htmlFor="model" label="Model" required>
                <Input
                  id="model"
                  name="model"
                  required
                  invalid={field === 'model'}
                />
              </FormField>
              <FormField htmlFor="year" label="Model year" required>
                <Select name="year" defaultValue={YEARS[0]} required>
                  <SelectTrigger id="year" invalid={field === 'year'}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="self-center">
            Compare prices
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
