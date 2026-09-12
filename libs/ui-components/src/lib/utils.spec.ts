import { cn } from './utils.js';

describe('cn', () => {
  it('merges class names, dropping falsy values', () => {
    expect(cn('a', undefined, false, 'b')).toBe('a b');
  });

  it('resolves conflicting Tailwind utility classes to the last one', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});
