import { fireEvent, render, screen } from '@testing-library/react';
import type { PageConfig } from 'api-client';
import { ConfigDrivenPage } from './ConfigDrivenPage.js';

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
          key: 'maritalStatus',
          label: 'Marital status',
          type: 'select',
          options: [
            { label: 'Single', value: 'single' },
            { label: 'Married', value: 'married' },
          ],
        },
      ],
    },
  ],
};

describe('ConfigDrivenPage', () => {
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
