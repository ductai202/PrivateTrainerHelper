import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Integration tests talk to the local Supabase (npx supabase start). Run: npm run test:integration
export default defineConfig({
  test: { include: ['tests/integration/**/*.test.ts'], testTimeout: 30000, fileParallelism: false },
  resolve: { alias: { '@': path.resolve(__dirname) } },
});
