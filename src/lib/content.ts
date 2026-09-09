import rawHome from '../../data/home_config.json';
import rawResume from '../../data/resume.json';
import rawSite from '../../data/site_config.json';
import type { HomeConfig, Resume, SiteConfig } from '../schemas';
import { HomeConfigSchema, ResumeSchema, SiteConfigSchema } from '../schemas';
import { formatSchemaFailure } from './content-errors';

function validated<T>(
  file: string,
  rootName: string,
  schema: { safeParse: (value: unknown) => { success: boolean; data?: T; error?: unknown } },
  raw: unknown
): T {
  const result = schema.safeParse(raw);
  if (result.success) return result.data as T;
  const refusal = new Error(formatSchemaFailure(file, rootName, raw, result.error));
  refusal.stack = '';
  throw refusal;
}

export const resume: Resume = validated(
  'data/resume.json',
  'resume',
  ResumeSchema,
  rawResume as unknown
);

export const site: SiteConfig = validated(
  'data/site_config.json',
  'site',
  SiteConfigSchema,
  rawSite as unknown
);

export const home: HomeConfig = validated(
  'data/home_config.json',
  'home',
  HomeConfigSchema,
  rawHome as unknown
);
