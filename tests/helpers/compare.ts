/**
 * Recursively compare two snapshot-like values, allowing a float tolerance for
 * numbers. Throws a descriptive, path-annotated error on mismatch.
 */
export function expectClose(actual: unknown, expected: unknown, eps = 1e-9, path = 'root'): void {
  if (typeof expected === 'number') {
    if (typeof actual !== 'number' || Math.abs(actual - expected) > eps) {
      throw new Error(`Mismatch at ${path}: ${String(actual)} vs ${String(expected)}`);
    }
    return;
  }
  if (
    typeof expected === 'string' ||
    typeof expected === 'boolean' ||
    expected === null ||
    expected === undefined
  ) {
    if (actual !== expected) {
      throw new Error(`Mismatch at ${path}: ${JSON.stringify(actual)} vs ${JSON.stringify(expected)}`);
    }
    return;
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) {
      throw new Error(`Array mismatch at ${path}: length ${(actual as unknown[])?.length} vs ${expected.length}`);
    }
    for (let i = 0; i < expected.length; i++) {
      expectClose(actual[i], expected[i], eps, `${path}[${i}]`);
    }
    return;
  }
  const eo = expected as Record<string, unknown>;
  const ao = (actual ?? {}) as Record<string, unknown>;
  const ek = Object.keys(eo).sort();
  const ak = Object.keys(ao).sort();
  if (ek.join(',') !== ak.join(',')) {
    throw new Error(`Key mismatch at ${path}: [${ak.join(',')}] vs [${ek.join(',')}]`);
  }
  for (const key of ek) {
    expectClose(ao[key], eo[key], eps, `${path}.${key}`);
  }
}
