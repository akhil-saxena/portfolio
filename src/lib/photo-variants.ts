/*
 * Kept free of `node:` imports on purpose. The pipeline hashes bytes with `node:crypto` on the
 * Actions runner, but this table is imported by the client, and importing it here would drag
 * `node:crypto` into the browser module graph. Pinned by photo-pipeline-contract.
 */
import type { REMOTE_URL_KEYS } from './image-origin.ts';

export type VariantTableFor<Keys extends readonly string[]> = {
  readonly [I in keyof Keys]: {
    readonly urlKey: Keys[I];
    readonly suffix: string;
    readonly maxWidth: number;
    readonly quality: number;
  };
};

export type VariantTable = VariantTableFor<typeof REMOTE_URL_KEYS>;

export const VARIANTS = [
  { urlKey: 'original', suffix: '', maxWidth: 2000, quality: 85 },
  { urlKey: 'large', suffix: '-lg', maxWidth: 1200, quality: 85 },
  { urlKey: 'medium', suffix: '-md', maxWidth: 800, quality: 85 },
  { urlKey: 'small', suffix: '-sm', maxWidth: 400, quality: 80 },
] as const satisfies VariantTable;

export const THUMB = {
  width: 40,
  quality: 60,
  dataUriPrefix: 'data:image/webp;base64,',
} as const;

export const PHOTO_ID_SEPARATOR = '-';
