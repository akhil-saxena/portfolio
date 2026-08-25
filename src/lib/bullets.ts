/**
 * STUB — plan 03-02, task 1, RED commit.
 *
 * The module exists at its final path with its final export names so that the spec in
 * `test/content/bullets.unit.test.ts` fails on BEHAVIOUR rather than on module
 * resolution. A red suite whose every case reads `Cannot find module` proves only that a
 * file is missing; it cannot tell you whether a single assertion is well-formed.
 *
 * Replaced by the real grammar in the GREEN commit that follows.
 */

export type BulletRun = { text: string; bold: boolean };

export function parseBullet(_source: string): BulletRun[] {
  throw new Error('parseBullet: not implemented');
}

export function serializeBullet(_runs: BulletRun[]): string {
  throw new Error('serializeBullet: not implemented');
}

export function containsHtmlTag(_source: string): boolean {
  throw new Error('containsHtmlTag: not implemented');
}
