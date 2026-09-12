import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { FeedbackButtons, type Feedback } from './FeedbackButtons.js';

function Controlled() {
  const [value, setValue] = useState<Feedback>(null);
  return <FeedbackButtons value={value} onChange={setValue} />;
}

describe('FeedbackButtons', () => {
  it('selects thumbs up on click', () => {
    render(<Controlled />);
    fireEvent.click(screen.getByLabelText('Good response'));
    expect(screen.getByLabelText('Good response')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('clicking the already-selected choice clears it', () => {
    render(<Controlled />);
    const up = screen.getByLabelText('Good response');
    fireEvent.click(up);
    fireEvent.click(up);
    expect(up).toHaveAttribute('aria-pressed', 'false');
  });

  it('switching from up to down clears up', () => {
    render(<Controlled />);
    fireEvent.click(screen.getByLabelText('Good response'));
    fireEvent.click(screen.getByLabelText('Bad response'));
    expect(screen.getByLabelText('Good response')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByLabelText('Bad response')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
