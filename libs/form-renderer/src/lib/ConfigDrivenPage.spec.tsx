import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PageConfig } from 'api-client';
import { ConfigDrivenPage } from './ConfigDrivenPage.js';
import { useValidatorRunner } from './useValidatorRunner.js';

jest.mock('./useValidatorRunner.js', () => ({ useValidatorRunner: jest.fn() }));
const mockUseValidatorRunner = useValidatorRunner as jest.Mock;

const pageConfig: PageConfig = {
  key: 'driver-info',
  title: 'Driver Information',
  sections: [
    {
      key: 'personal',
      title: 'Personal Information',
      fields: [
        { key: 'firstName', label: 'First name', type: 'text', required: true },
        { key: 'dob', label: 'Date of birth', type: 'date', required: true },
        {
          key: 'ssn',
          label: 'SSN',
          type: 'text',
          required: true,
          validator: 'ssn',
        },
        {
          key: 'maritalStatus',
          label: 'Marital status',
          type: 'select',
          options: [
            { label: 'Single', value: 'single' },
            { label: 'Married', value: 'married' },
          ],
        },
        { key: 'isMarried', label: 'Is married', type: 'checkbox' },
      ],
    },
  ],
};

describe('ConfigDrivenPage', () => {
  beforeEach(() => {
    mockUseValidatorRunner.mockReturnValue({
      validate: jest.fn().mockResolvedValue({ valid: true }),
    });
  });

  it('renders one input per configured field, grouped by section', () => {
    render(
      <ConfigDrivenPage
        config={pageConfig}
        values={{}}
        onFieldChange={() => undefined}
      />,
    );
    expect(screen.getByText('Personal Information')).toBeInTheDocument();
    expect(screen.getByLabelText(/First name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date of birth/)).toBeInTheDocument();
  });

  it('calls onFieldChange with the field key and new value', () => {
    const onFieldChange = jest.fn();
    render(
      <ConfigDrivenPage
        config={pageConfig}
        values={{}}
        onFieldChange={onFieldChange}
      />,
    );
    fireEvent.change(screen.getByLabelText(/First name/), {
      target: { value: 'Jane' },
    });
    expect(onFieldChange).toHaveBeenCalledWith('firstName', 'Jane');
  });

  it('shows a field-level error message when one is passed', () => {
    render(
      <ConfigDrivenPage
        config={pageConfig}
        values={{ firstName: '' }}
        errors={{ firstName: 'First name is required' }}
        onFieldChange={() => undefined}
      />,
    );
    expect(screen.getByText('First name is required')).toBeInTheDocument();
  });

  it('renders a checkbox field and calls onFieldChange with a boolean-shaped string on toggle', () => {
    const onFieldChange = jest.fn();
    render(
      <ConfigDrivenPage
        config={pageConfig}
        values={{}}
        onFieldChange={onFieldChange}
      />,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: /Is married/i }));
    expect(onFieldChange).toHaveBeenCalledWith('isMarried', 'true');
  });

  it('renders a checked checkbox when the value is the string "true"', () => {
    render(
      <ConfigDrivenPage
        config={pageConfig}
        values={{ isMarried: 'true' }}
        onFieldChange={() => undefined}
      />,
    );
    expect(screen.getByRole('checkbox', { name: /Is married/i })).toBeChecked();
  });

  it('renders a select field with its configured options', () => {
    render(
      <ConfigDrivenPage
        config={pageConfig}
        values={{}}
        onFieldChange={() => undefined}
      />,
    );
    expect(screen.getByText(/Select marital status/)).toBeInTheDocument();
  });

  it('runs the field validator on blur (Pattern 2) and shows its error message', async () => {
    const validate = jest
      .fn()
      .mockResolvedValue({ valid: false, message: 'Invalid SSN prefix' });
    mockUseValidatorRunner.mockReturnValue({ validate });

    render(
      <ConfigDrivenPage
        config={pageConfig}
        values={{ ssn: '000-45-6789' }}
        onFieldChange={() => undefined}
        ratingServiceBaseUrl="http://localhost:4000"
      />,
    );
    fireEvent.blur(screen.getByLabelText(/SSN/));

    expect(validate).toHaveBeenCalledWith('ssn', '000-45-6789');
    await waitFor(() =>
      expect(screen.getByText('Invalid SSN prefix')).toBeInTheDocument(),
    );
  });

  it('does not call the validator for a field with no validator name configured', () => {
    const validate = jest.fn().mockResolvedValue({ valid: true });
    mockUseValidatorRunner.mockReturnValue({ validate });

    render(
      <ConfigDrivenPage
        config={pageConfig}
        values={{}}
        onFieldChange={() => undefined}
      />,
    );
    fireEvent.blur(screen.getByLabelText(/First name/));

    expect(validate).not.toHaveBeenCalled();
  });

  it('a server-reported error takes precedence over a passing client-side validation', () => {
    render(
      <ConfigDrivenPage
        config={pageConfig}
        values={{ ssn: '123-45-6789' }}
        errors={{ ssn: 'SSN already on file for another quote' }}
        onFieldChange={() => undefined}
      />,
    );
    expect(
      screen.getByText('SSN already on file for another quote'),
    ).toBeInTheDocument();
  });

  it('throws a clear error for an unregistered field type rather than silently skipping it', () => {
    const badConfig: PageConfig = {
      key: 'bad',
      title: 'Bad',
      sections: [
        {
          key: 's',
          title: 'S',
          fields: [{ key: 'f', label: 'F', type: 'textarea' as never }],
        },
      ],
    };
    expect(() =>
      render(
        <ConfigDrivenPage
          config={badConfig}
          values={{}}
          onFieldChange={() => undefined}
        />,
      ),
    ).toThrow(/No field component registered/);
  });
});
