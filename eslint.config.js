import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.vite/**',
      'public/**',
      'content/**',
      'docs/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'no-console': 'off',
    },
  },
  {
    // Tools and tests may use the console and Node globals freely.
    files: ['tools/**/*.ts', 'tests/**/*.ts', '**/*.config.{js,ts}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // Deterministic runtime packages must not use Math.random() — runtime
    // visuals derive from the authoritative time and a seeded RNG so that
    // evaluateAt(t) is reproducible and scrubbing is exact. Editor / tooling /
    // app code is intentionally NOT covered by this rule.
    files: [
      'packages/engine/**/*.ts',
      'packages/motions/**/*.ts',
      'packages/effects/**/*.ts',
      'packages/cameras/**/*.ts',
      'packages/environments/**/*.ts',
      'packages/characters/**/*.ts',
      'packages/style/**/*.ts',
    ],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message:
            'Runtime visuals must be deterministic. Use createRng()/hashSeed() from @mindforge/engine with a stable seed instead of Math.random().',
        },
      ],
    },
  },
);
