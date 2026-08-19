/**
 * Types shared by the test projects.
 *
 * The `ProvidedContext` augmentation lives here rather than beside the global setup that
 * calls `project.provide()`, because `test/setup/preview-server.ts` is the one file in the
 * repository excluded from `astro check` (see the note in tsconfig.json — the project has
 * no `@types/node`, so `node:*` imports do not resolve). Keeping the augmentation in a
 * checked file means `inject('previewBaseUrl')` stays type-safe in every test even though
 * the module that provides it is not itself typechecked.
 */
declare module 'vitest' {
  interface ProvidedContext {
    /** Origin of the running `astro preview` server, e.g. `http://127.0.0.1:53189`. */
    previewBaseUrl: string;
  }
}

export {};
