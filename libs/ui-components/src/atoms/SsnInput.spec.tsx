import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { SsnInput } from './SsnInput.js';

function Controlled() {
  const [value, setValue] = useState('');
  return <SsnInput id="ssn" value={value} onChange={setValue} />;
}

describe('SsnInput', () => {
  it('formats digits into XXX-XX-XXXX as they are typed', () => {
    render(<Controlled />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.input(input, { target: { value: '123456789' } });
    expect(input.value).toBe('123-45-6789');
  });

  it('displays as a password field once blurred with a value present', () => {
    render(<Controlled />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.input(input, { target: { value: '123456789' } });
    fireEvent.blur(input);

    expect(input.type).toBe('password');
    // Masking is display-only — the underlying value (what a form would submit) is untouched.
    expect(input.value).toBe('123-45-6789');
  });

  it('reveals the value again on focus', () => {
    render(<Controlled />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.input(input, { target: { value: '123456789' } });
    fireEvent.blur(input);
    fireEvent.focus(input);

    expect(input.type).toBe('text');
  });

  it('stays a text field on blur when there is no value yet', () => {
    render(<Controlled />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(input.type).toBe('text');
  });

  it('calls onChange with the formatted value in controlled mode', () => {
    const onChange = jest.fn();
    render(<SsnInput id="ssn" value="" onChange={onChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.input(input, { target: { value: '123456789' } });
    expect(onChange).toHaveBeenCalledWith('123-45-6789');
  });

  it('participates in a native form via name/defaultValue when uncontrolled', () => {
    render(<SsnInput id="ssn" name="ssn" defaultValue="123456789" />);
    const input = screen.getByDisplayValue('123-45-6789') as HTMLInputElement;
    expect(input.name).toBe('ssn');
  });
});
