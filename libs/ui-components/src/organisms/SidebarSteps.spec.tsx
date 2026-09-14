import { fireEvent, render, screen } from '@testing-library/react';
import { SidebarSteps } from './SidebarSteps.js';

const groups = [
  {
    heading: 'Build your plan',
    steps: [{ key: 'schema', label: 'Personal Details' }],
  },
  {
    heading: 'Review & purchase',
    steps: [
      { key: 'rc1', label: 'Your Quote' },
      { key: 'rc2', label: 'Driving Record' },
      { key: 'bind', label: 'Purchase' },
    ],
  },
];

describe('SidebarSteps', () => {
  it('renders steps as plain text when onStepClick is not provided', () => {
    render(
      <SidebarSteps
        groups={groups}
        currentStepKey="rc2"
        completedStepKeys={['schema', 'rc1']}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Your Quote' })).toBeNull();
    expect(screen.getByText('Your Quote')).toBeInTheDocument();
  });

  it('renders completed and current steps as clickable buttons when onStepClick is provided', () => {
    const onStepClick = jest.fn();
    render(
      <SidebarSteps
        groups={groups}
        currentStepKey="rc2"
        completedStepKeys={['schema', 'rc1']}
        onStepClick={onStepClick}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Your Quote' }));
    expect(onStepClick).toHaveBeenCalledWith('rc1');
  });

  it('does not make a not-yet-reached step clickable', () => {
    const onStepClick = jest.fn();
    render(
      <SidebarSteps
        groups={groups}
        currentStepKey="rc1"
        completedStepKeys={['schema']}
        onStepClick={onStepClick}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Purchase' })).toBeNull();
    expect(screen.getByText('Purchase')).toBeInTheDocument();
  });
});
