/**
 * The two content files that are arrays, as Astro content collections.
 *
 * WHY THIS FILE EXISTS WHEN `astro.config.mjs` ALREADY VALIDATES EVERYTHING
 * ------------------------------------------------------------------------
 * Two reasons, and neither is "collections are the Astro way".
 *
 * 1. IT IS A SECOND, INDEPENDENT ENFORCEMENT POINT, AND IT WAS MEASURED. Plan 03-08 corrupted
 *    `data/portfolio_images.json` — `order: "twelve"` on record 12 — with this file in place and
 *    nothing importing `getCollection` anywhere. `astro build` exited **1** and emitted no
 *    `dist/`, naming the collection, the record by its id, and the field:
 *
 *        [InvalidContentEntryDataError] photos → landscape-hillsandgreens data does not match
 *        collection schema.  order**: **order: Expected type `"number"`, received `"string"`
 *
 *    Content sync runs before the build regardless of whether a page reads a collection, which is
 *    exactly the property a module-scope parse turned out NOT to have (see `src/lib/content.ts`).
 *
 * 2. PHASE 5 WANTS `getCollection('photos')`. The gallery and the case-study routes are collection
 *    consumers; wiring the loader now means those pages import a validated store rather than a raw
 *    JSON file, and the schema they are validated against is the same object this file imports.
 *
 * WHAT THIS FILE MUST NOT DO, AND WHAT ENFORCES THAT
 * -------------------------------------------------
 * Redefine a shape. `PhotoSchema` and `ProjectSchema` are IMPORTED from `src/schemas`, which is the
 * single definition of every content shape in this project.
 * `scripts/assert-single-schema-source.mjs` fails on a rival `z.object` over content fields
 * anywhere under `src/`, and this file is inside its scan — so a locally-written copy of the photo
 * shape here is a build failure, by design and by measurement.
 *
 * The per-ENTRY schema is used rather than the manifest wrapper: the `file()` loader hands each
 * array element to the schema individually, so `PhotoManifestSchema` (which is
 * `z.array(PhotoSchema).min(1)`) would reject every entry for not being an array. The `.min(1)`
 * anti-vacuity guard that wrapper carries is not lost — `astro.config.mjs` runs the manifest schema
 * over the whole file, which is where an emptied file is caught.
 *
 * WHAT THE LOADER CANNOT DO, READ OUT OF ITS OWN SOURCE (`astro/dist/content/loaders/file.js`)
 * -------------------------------------------------------------------------------------------
 * A MISSING OR UNPARSEABLE FILE IS LOGGED, NOT THROWN. `load()` does
 * `if (!existsSync(url)) { logger.error(...); return; }`, and the read/parse is wrapped in a
 * `try/catch` that also logs and returns. An empty array is a `logger.warn("No items found")`.
 * So a deleted `data/projects.json` would leave this collection silently empty and the build green.
 * That is the vacuity hole this phase's register is full of, and it is why the collections are the
 * SECOND enforcement point rather than the only one: the `astro.config.mjs` hook reads all five
 * files itself and refuses when one cannot be read or holds an empty array.
 */

import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { PhotoSchema, ProjectSchema } from './schemas';

export const collections = {
  photos: defineCollection({
    loader: file('data/portfolio_images.json'),
    schema: PhotoSchema,
  }),
  projects: defineCollection({
    loader: file('data/projects.json'),
    schema: ProjectSchema,
  }),
};
