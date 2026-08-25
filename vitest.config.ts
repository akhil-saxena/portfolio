/**
 * Root Vitest config. It composes the three projects BY REFERENCE and nothing else.
 *
 * The composition is a list of paths rather than inlined option objects on purpose: the
 * workers pool cannot share a config with another project (it replaces the runtime the
 * test files are evaluated in), so merging the two into one options object is the single
 * most common way this setup fails. Vitest 4 types `test.projects` as
 * `TestProjectConfiguration[]` where `TestProjectConfiguration = string | ...`
 * (`vitest/dist/chunks/reporters.d.*.d.ts`), and the string form points at a standalone
 * project config file — each is loaded in isolation with its own plugins.
 *
 * Deliberately empty otherwise. Any `test.*` option added here would be inherited by
 * all three projects, including the pool one, which is how ambient config leaks into
 * workerd. Plan 03-02 added the third entry and touched nothing else in this file for
 * exactly that reason — `unit` needs no shared option, and the cheapest way to give it
 * one by accident is to put it here.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      './vitest.workers.config.ts',
      './vitest.integration.config.ts',
      './vitest.unit.config.ts',
    ],
  },
});
