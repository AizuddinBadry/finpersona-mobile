import { describe, it, expect } from 'vitest';
import { tokens } from './tokens';

describe('tokens', () => {
  it('exposes brand purple matching the mockup', () => {
    expect(tokens.color.purple).toBe('#6E4CE6');
  });
  it('exposes hero gradient', () => {
    expect(tokens.gradient.hero).toMatch(/^linear-gradient/);
  });
  it('exposes radius scale', () => {
    expect(tokens.radius.pill).toBe(9999);
  });
});
