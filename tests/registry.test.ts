import { describe, expect, it } from 'vitest';
import { Registry, DuplicateRegistryIdError, UnknownRegistryIdError } from '@mindforge/engine';

describe('Registry', () => {
  it('resolves known ids', () => {
    const registry = new Registry<number>('test');
    registry.register('alpha', 1);
    expect(registry.has('alpha')).toBe(true);
    expect(registry.get('alpha')).toBe(1);
  });

  it('throws a clear error for a missing id', () => {
    const registry = new Registry<number>('test');
    expect(() => registry.get('missing')).toThrow(UnknownRegistryIdError);
    expect(() => registry.get('missing')).toThrow(/test id "missing"/);
  });

  it('prevents duplicate ids', () => {
    const registry = new Registry<number>('test');
    registry.register('alpha', 1);
    expect(() => registry.register('alpha', 2)).toThrow(DuplicateRegistryIdError);
  });

  it('lists ids sorted', () => {
    const registry = new Registry<number>('test');
    registry.register('gamma', 3).register('alpha', 1).register('beta', 2);
    expect(registry.list()).toEqual(['alpha', 'beta', 'gamma']);
  });
});
