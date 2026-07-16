import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/models.ts'],
      thresholds: { lines: 70 },
    },
  },
});
