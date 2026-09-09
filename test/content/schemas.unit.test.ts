import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { containsHtmlTag } from '../../src/lib/bullets';
import { IMAGE_ORIGIN } from '../../src/lib/image-origin';
import {
  HomeConfigSchema,
  PhotoManifestSchema,
  PhotoSchema,
  ProjectsSchema,
  ResumeSchema,
  SiteConfigSchema,
  validateContentSet,
} from '../../src/schemas';

const read = (relative: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8'));

const source = (relative: string): string =>
  readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8');

const PHOTOS = read('data/portfolio_images.json') as Record<string, unknown>[];
const SITE = read('data/site_config.json') as Record<string, unknown>;
const HOME = read('data/home_config.json') as Record<string, unknown>;
const PROJECTS = read('data/projects.json') as Record<string, unknown>[];
const RESUME = read('data/resume.json') as Record<string, unknown>;

const MIN_PHOTOS = 39;

const EXPECTED_CATEGORIES = 5;
const EXPECTED_PEEK_IDS = 6;
const EXPECTED_PROJECTS = 5;
const EXPECTED_BULLETS = 13;

const clone = <T>(value: T): T => structuredClone(value);

function mutated<T>(original: T, pointer: string, mutate: (draft: T) => void): T {
  const draft = clone(original);
  mutate(draft);

  const before = JSON.parse(JSON.stringify(original));
  const after = JSON.parse(JSON.stringify(draft));
  const diffs = diffPointers(before, after, '');

  if (diffs.length !== 1 || diffs[0] !== pointer) {
    throw new Error(
      `mutated(): expected exactly one change at ${pointer}, got ${diffs.length}: ` +
        `${JSON.stringify(diffs)}. A negative case that changes two fields proves nothing ` +
        `about either.`
    );
  }
  return draft;
}

function diffPointers(a: unknown, b: unknown, at: string): string[] {
  if (a === b) return [];
  const bothObjects =
    typeof a === 'object' &&
    a !== null &&
    typeof b === 'object' &&
    b !== null &&
    Array.isArray(a) === Array.isArray(b);
  if (!bothObjects) return [at];

  const keys = new Set([...Object.keys(a as object), ...Object.keys(b as object)]);
  const out: string[] = [];
  for (const key of keys) {
    const av = (a as Record<string, unknown>)[key];
    const bv = (b as Record<string, unknown>)[key];
    const hasA = key in (a as object);
    const hasB = key in (b as object);
    if (hasA !== hasB) {
      out.push(`${at}/${key}`);
      continue;
    }
    out.push(...diffPointers(av, bv, `${at}/${key}`));
  }
  return out;
}

function errorText(result: { success: boolean; error?: unknown }): string {
  if (result.success) throw new Error('expected a parse failure, got success');
  const error = result.error as { message?: string; issues?: unknown };
  return `${error.message ?? ''}\n${JSON.stringify(error.issues ?? error)}`;
}

function reportText(report: {
  ok: boolean;
  violations: { rule: string; where: string; detail: string; why: string }[];
}): string {
  return report.violations.map((v) => `${v.rule} | ${v.where} | ${v.detail} | ${v.why}`).join('\n');
}

const wholeSet = () => ({
  photos: PHOTOS,
  site: SITE,
  home: HOME,
  projects: PROJECTS,
  resume: RESUME,
});

describe('the mutated() harness', () => {
  it('refuses a two-field change — the rejection would be credited to the wrong field', () => {
    expect(() =>
      mutated(PHOTOS[0], '/alt', (draft) => {
        draft.alt = 'x';
        draft.title = 'y';
      })
    ).toThrow(/expected exactly one change/);
  });

  it('refuses a NO-OP mutation — a negative case that changes nothing tests nothing', () => {
    expect(() => mutated(PHOTOS[0], '/alt', () => {})).toThrow(/expected exactly one change/);
  });

  it('refuses a change at a pointer other than the declared one', () => {
    expect(() =>
      mutated(PHOTOS[0], '/alt', (draft) => {
        draft.title = 'y';
      })
    ).toThrow(/expected exactly one change at \/alt/);
  });

  it('sees a key DELETION as a diff, not as equality', () => {
    expect(() =>
      mutated(PHOTOS[0], '/wrong-pointer', (draft) => {
        delete draft.alt;
      })
    ).toThrow(/\/alt/);
  });
});

describe('the data this file is written against', () => {
  it('holds at least the reviewed photo corpus, and the four fixed censuses exactly', () => {
    expect(PHOTOS.length).toBeGreaterThanOrEqual(MIN_PHOTOS);
    expect((SITE.categories as unknown[]).length).toBe(EXPECTED_CATEGORIES);
    expect((HOME.peekIds as unknown[]).length).toBe(EXPECTED_PEEK_IDS);
    expect(PROJECTS).toHaveLength(EXPECTED_PROJECTS);
    const bullets = (RESUME.experience as { bullets: string[] }[]).flatMap((e) => e.bullets);
    expect(bullets).toHaveLength(EXPECTED_BULLETS);
  });

  it('carries exif on every record with nullable fields — not optional (the 11-record trap)', () => {
    const withExif = PHOTOS.filter((p) => 'exif' in p);
    expect(withExif).toHaveLength(PHOTOS.length);
    expect(PHOTOS.length).toBeGreaterThanOrEqual(MIN_PHOTOS);
    const nullLens = PHOTOS.filter((p) => (p.exif as Record<string, unknown>).lens === null);
    expect(nullLens.length).toBeGreaterThan(0);
    const allNull = PHOTOS.filter((p) =>
      Object.values(p.exif as Record<string, unknown>).every((v) => v === null)
    ).map((p) => p.id);
    expect(allNull).toEqual(['still-life-peppers']);
  });
});

describe('the committed data parses as it stands', () => {
  it('data/portfolio_images.json', () => {
    const result = PhotoManifestSchema.safeParse(PHOTOS);
    expect(result.success ? null : errorText(result)).toBeNull();
  });

  it('data/site_config.json', () => {
    const result = SiteConfigSchema.safeParse(SITE);
    expect(result.success ? null : errorText(result)).toBeNull();
  });

  it('data/home_config.json', () => {
    const result = HomeConfigSchema.safeParse(HOME);
    expect(result.success ? null : errorText(result)).toBeNull();
  });

  it('data/projects.json', () => {
    const result = ProjectsSchema.safeParse(PROJECTS);
    expect(result.success ? null : errorText(result)).toBeNull();
  });

  it('data/resume.json', () => {
    const result = ResumeSchema.safeParse(RESUME);
    expect(result.success ? null : errorText(result)).toBeNull();
  });

  it('the whole set passes validateContentSet, and says how much it looked at', () => {
    const report = validateContentSet(wholeSet());
    expect(reportText(report)).toBe('');
    expect(report.ok).toBe(true);
    expect(report.checked.photos).toBe(PHOTOS.length);
    expect(PHOTOS.length).toBeGreaterThanOrEqual(MIN_PHOTOS);
    expect(report.checked.categories).toBe(EXPECTED_CATEGORIES);
    expect(report.checked.peekIds).toBe(EXPECTED_PEEK_IDS);
    expect(report.checked.projects).toBe(EXPECTED_PROJECTS);
    expect(report.checked.categoryOrderGroups).toBe(EXPECTED_CATEGORIES);
    expect(report.checked.rulesRun).toHaveLength(6);
    expect(report.checked.rulesSkipped).toEqual([]);
  });
});

describe('vacuity — nothing to check is a failure, never a pass', () => {
  it('fails on empty photos rather than iterating zero records and reporting clean', () => {
    const report = validateContentSet({ ...wholeSet(), photos: [] });
    expect(report.ok).toBe(false);
    expect(report.checked.photos).toBe(0);
    expect(reportText(report)).toMatch(/photos/i);
  });

  it('fails on empty categories', () => {
    const report = validateContentSet({
      ...wholeSet(),
      site: { ...clone(SITE), categories: [] },
    });
    expect(report.ok).toBe(false);
    expect(reportText(report)).toMatch(/categor/i);
  });

  it('fails on empty peekIds', () => {
    const report = validateContentSet({
      ...wholeSet(),
      home: { ...clone(HOME), peekIds: [], peekPositions: {} },
    });
    expect(report.ok).toBe(false);
    expect(reportText(report)).toMatch(/peekIds/);
  });

  it('fails on an entirely empty set, and names every empty thing rather than the first', () => {
    const report = validateContentSet({
      photos: [],
      site: { categories: [], defaultColumns: 3 },
      home: { ...clone(HOME), peekIds: [], peekPositions: {} },
      projects: [],
      resume: { experience: [], skills: [], education: [] },
    });
    expect(report.ok).toBe(false);
    const text = reportText(report);
    for (const thing of ['photos', 'categor', 'peekIds', 'projects', 'experience']) {
      expect(text).toMatch(new RegExp(thing, 'i'));
    }
  });

  it('fails when a whole file is missing rather than skipping the rules that need it', () => {
    const report = validateContentSet({ ...wholeSet(), site: undefined });
    expect(report.ok).toBe(false);
    expect(report.checked.rulesSkipped.length).toBeGreaterThan(0);
    expect(report.checked.rulesSkipped.map((s) => s.rule).join(' ')).toMatch(/RI-1/);
  });
});

describe('RI-1 — the rule ADR-002 traded /admin/site for', () => {
  it('names the photo AND the offending category', () => {
    const photos = mutated(PHOTOS, '/0/category', (draft) => {
      draft[0].category = 'landscapes';
    });
    const report = validateContentSet({ ...wholeSet(), photos });
    expect(report.ok).toBe(false);
    const text = reportText(report);
    expect(text).toContain(PHOTOS[0].id as string);
    expect(text).toContain('landscapes');
  });

  it('does NOT accept "all" as a category, which is the whole of OD-2', () => {
    const photos = mutated(PHOTOS, '/0/category', (draft) => {
      draft[0].category = 'all';
    });
    const report = validateContentSet({ ...wholeSet(), photos });
    expect(report.ok).toBe(false);
    expect(reportText(report)).toContain('all');
  });

  it('rejects a category that differs only in case — no transform anywhere', () => {
    const photos = mutated(PHOTOS, '/0/category', (draft) => {
      draft[0].category = 'Abstract';
    });
    const report = validateContentSet({ ...wholeSet(), photos });
    expect(report.ok).toBe(false);
  });

  it('accumulates: two orphaned photos produce two named violations, not one', () => {
    const photos = clone(PHOTOS);
    photos[0].category = 'landscapes';
    photos[1].category = 'macro';
    const report = validateContentSet({ ...wholeSet(), photos });
    const text = reportText(report);
    expect(text).toContain('landscapes');
    expect(text).toContain('macro');
    expect(text).toContain(PHOTOS[0].id as string);
    expect(text).toContain(PHOTOS[1].id as string);
  });
});

describe('RI-2 — the other direction: a category no photo uses ships as an empty filter tab', () => {
  it('names the unused id', () => {
    const site = mutated(SITE, `/categories/${(SITE.categories as unknown[]).length}`, (draft) => {
      (draft.categories as unknown[]).push({ id: 'macro', label: 'Macro', columns: 3 });
    });
    const report = validateContentSet({ ...wholeSet(), site });
    expect(report.ok).toBe(false);
    expect(reportText(report)).toContain('macro');
  });
});

describe('RI-3 / RI-4 — peek ids and peek positions', () => {
  it('a peek id that is not a photo id fails, naming it', () => {
    const home = mutated(HOME, '/peekIds/0', (draft) => {
      (draft.peekIds as string[])[0] = 'wildlife-deleted';
    });
    const report = validateContentSet({ ...wholeSet(), home });
    expect(report.ok).toBe(false);
    expect(reportText(report)).toContain('wildlife-deleted');
  });

  it('a peek POSITION for a photo not in peekIds fails separately, with its own message', () => {
    const home = mutated(HOME, '/peekPositions/still-life-davidjpg', (draft) => {
      (draft.peekPositions as Record<string, string>)['still-life-davidjpg'] = '50% 25%';
    });
    const report = validateContentSet({ ...wholeSet(), home });
    expect(report.ok).toBe(false);
    const text = reportText(report);
    expect(text).toContain('still-life-davidjpg');
    expect(text).toContain('RI-4');
    expect(text).not.toContain('RI-3');
  });

  it('the two rules are independent: a bad id fires RI-3 and not RI-4', () => {
    const home = mutated(HOME, '/peekIds/1', (draft) => {
      (draft.peekIds as string[])[1] = 'ghost-photo';
    });
    const report = validateContentSet({ ...wholeSet(), home });
    const text = reportText(report);
    expect(text).toContain('RI-3');
    expect(text).not.toContain('RI-4');
  });
});

describe('RI-5 / RI-6 — uniqueness', () => {
  it('duplicate photo ids fail with the duplicated value named', () => {
    const photos = mutated(PHOTOS, '/1/id', (draft) => {
      draft[1].id = draft[0].id;
    });
    const report = validateContentSet({ ...wholeSet(), photos });
    expect(report.ok).toBe(false);
    expect(reportText(report)).toContain(PHOTOS[0].id as string);
  });

  it('duplicate global order values fail with the duplicated value named', () => {
    const photos = mutated(PHOTOS, '/1/order', (draft) => {
      draft[1].order = draft[0].order;
    });
    const report = validateContentSet({ ...wholeSet(), photos });
    expect(report.ok).toBe(false);
    expect(reportText(report)).toContain(String(PHOTOS[0].order));
  });

  it('duplicate project ids fail with the duplicated value named', () => {
    const projects = mutated(PROJECTS, '/1/id', (draft) => {
      draft[1].id = draft[0].id;
    });
    const report = validateContentSet({ ...wholeSet(), projects });
    expect(report.ok).toBe(false);
    expect(reportText(report)).toContain(PROJECTS[0].id as string);
  });

  it('duplicate categoryOrder WITHIN a category fails, naming the category', () => {
    const inAbstract = PHOTOS.map((p, i) => ({ p, i })).filter(
      ({ p }) => p.category === 'architecture'
    );
    const target = inAbstract[1];
    const photos = mutated(PHOTOS, `/${target.i}/categoryOrder`, (draft) => {
      draft[target.i].categoryOrder = inAbstract[0].p.categoryOrder;
    });
    const report = validateContentSet({ ...wholeSet(), photos });
    expect(report.ok).toBe(false);
    const text = reportText(report);
    expect(text).toContain('architecture');
    expect(text).toContain('RI-6');
  });

  it('the SAME categoryOrder in two DIFFERENT categories is legal — RI-6 is per-group', () => {
    const ranks = new Map<string, number[]>();
    for (const p of PHOTOS) {
      const list = ranks.get(p.category as string) ?? [];
      list.push(p.categoryOrder as number);
      ranks.set(p.category as string, list);
    }
    const allRanks = [...ranks.values()].flat();
    expect(new Set(allRanks).size).toBeLessThan(allRanks.length);
    expect(validateContentSet(wholeSet()).ok).toBe(true);
  });
});

describe('résumé bullets — the predicate is imported, not restated', () => {
  const bulletCase = (text: string) =>
    ResumeSchema.safeParse(
      mutated(RESUME, '/experience/0/bullets/0', (draft) => {
        (draft.experience as { bullets: string[] }[])[0].bullets[0] = text;
      })
    );

  it('rejects <script>alert(1)</script>', () => {
    const result = bulletCase('<script>alert(1)</script>');
    expect(result.success).toBe(false);
    expect(errorText(result)).toMatch(/html|tag|markup/i);
  });

  it.each([
    ['<b>bold</b>', 'a benign-looking tag is still markup'],
    ['<!-- comment -->', 'the case that made containsHtmlTag widen beyond four rules'],
    ['<img src=x onerror=alert(1)>', 'an unclosed tag'],
    ['</p>', 'a bare close tag'],
  ])('rejects %s (%s)', (text) => {
    expect(bulletCase(text).success).toBe(false);
  });

  it.each([
    ['Reduced p95 < 50ms across the checkout flow'],
    ['Kept a < b > c stable under load'],
    ['Cut cold starts to 2 <3 seconds'],
  ])('ACCEPTS %s — a restated /[<>]/ would reject this real prose', (text) => {
    const result = bulletCase(text);
    expect(result.success ? null : errorText(result)).toBeNull();
  });

  it('agrees with containsHtmlTag on every case above — same predicate, one definition', () => {
    const corpus = [
      '<script>alert(1)</script>',
      '<b>bold</b>',
      '<!-- comment -->',
      '</p>',
      'Reduced p95 < 50ms across the checkout flow',
      'Kept a < b > c stable under load',
      'Cut cold starts to 2 <3 seconds',
    ];
    for (const text of corpus) {
      const rejectedBySchema = !bulletCase(text).success;
      expect([text, rejectedBySchema]).toEqual([text, containsHtmlTag(text)]);
    }
  });

  it('rejects an unbalanced ** that containsHtmlTag cannot see — parseBullet catches it', () => {
    const result = bulletCase('Reduced **p95 latency by 40%');
    expect(result.success).toBe(false);
    expect(containsHtmlTag('Reduced **p95 latency by 40%')).toBe(false);
  });

  it('rejects an empty bullet', () => {
    expect(bulletCase('').success).toBe(false);
  });

  it('src/schemas/resume.ts imports the predicate and carries no HTML regex of its own', () => {
    const text = source('src/schemas/resume.ts');
    expect(text).toMatch(/import\s*\{[^}]*containsHtmlTag[^}]*\}\s*from\s*'[^']*lib\/bullets'/);
    expect(text).not.toMatch(/\/[^/\n]*<[^/\n]*\/[gimsuy]*/);
  });
});

describe('photo urls', () => {
  const urlCase = (key: string, value: string) =>
    PhotoSchema.safeParse(
      mutated(PHOTOS[0], `/urls/${key}`, (draft) => {
        (draft.urls as Record<string, string>)[key] = value;
      })
    );

  it('rejects the legacy development origin', () => {
    const result = urlCase('large', 'https://pub-2d90aedeebcf4142afe524930c3b6471.r2.dev/x.webp');
    expect(result.success).toBe(false);
    expect(errorText(result)).toContain(IMAGE_ORIGIN);
  });

  it('rejects ANY other origin, not just the legacy one', () => {
    expect(urlCase('medium', 'https://cdn.example.com/x.webp').success).toBe(false);
  });

  it('rejects a look-alike origin that merely starts with the right characters', () => {
    expect(urlCase('small', 'https://images.akhilsaxena.com.evil.test/x.webp').success).toBe(false);
  });

  it('rejects a relative path', () => {
    expect(urlCase('original', '/photos/abstract/x.webp').success).toBe(false);
  });

  it('rejects an http url in thumb — thumb is a base64 LQIP, not an address', () => {
    expect(urlCase('thumb', `${IMAGE_ORIGIN}/photos/abstract/x.webp`).success).toBe(false);
  });

  it('rejects a data URI in a remote key', () => {
    expect(urlCase('large', 'data:image/webp;base64,AAAA').success).toBe(false);
  });

  it('rejects a missing urls key', () => {
    const result = PhotoSchema.safeParse(
      mutated(PHOTOS[0], '/urls/medium', (draft) => {
        delete (draft.urls as Record<string, string>).medium;
      })
    );
    expect(result.success).toBe(false);
  });
});

describe('alt text — the brief stops being the authority the moment 03-04 merges', () => {
  const altCase = (value: unknown) =>
    PhotoSchema.safeParse(
      mutated(PHOTOS[0], '/alt', (draft) => {
        draft.alt = value as string;
      })
    );

  it('rejects an empty alt', () => {
    expect(altCase('').success).toBe(false);
  });

  it('rejects a whitespace-only alt', () => {
    expect(altCase('   ').success).toBe(false);
  });

  it('rejects a missing alt', () => {
    const result = PhotoSchema.safeParse(
      mutated(PHOTOS[0], '/alt', (draft) => {
        delete draft.alt;
      })
    );
    expect(result.success).toBe(false);
  });

  it('rejects alt that equals its own title', () => {
    const result = altCase(PHOTOS[0].title);
    expect(result.success).toBe(false);
    expect(errorText(result)).toMatch(/title/i);
  });

  it('rejects alt that equals its title ignoring case and surrounding whitespace', () => {
    expect(altCase(`  ${(PHOTOS[0].title as string).toUpperCase()}  `).success).toBe(false);
  });

  it.each(['Image of two cables in fog', 'photo of two cables', 'PICTURE OF two cables'])(
    'rejects the role prefix %s',
    (value) => {
      expect(altCase(value).success).toBe(false);
    }
  );

  it('ACCEPTS prose that merely contains the word photo away from the start', () => {
    expect(altCase('A photograph-like haze fills the frame above two cables.').success).toBe(true);
  });

  it('rejects a marker that leaked out of the brief', () => {
    expect(altCase('[AKHIL-ALT]').success).toBe(false);
  });
});

describe('OD-3 — tags is dropped', () => {
  it('is absent from every committed record', () => {
    expect(PHOTOS.filter((p) => 'tags' in p)).toHaveLength(0);
    expect(PHOTOS.length).toBeGreaterThanOrEqual(MIN_PHOTOS);
  });

  it('is REJECTED by the schema, so a stray tag fails the build rather than sitting unread', () => {
    const result = PhotoSchema.safeParse(
      mutated(PHOTOS[0], '/tags', (draft) => {
        draft.tags = [];
      })
    );
    expect(result.success).toBe(false);
    expect(errorText(result)).toMatch(/OD-3/);
  });

  it('is rejected even when it carries a real value', () => {
    const result = PhotoSchema.safeParse(
      mutated(PHOTOS[0], '/tags', (draft) => {
        draft.tags = ['fog', 'cables'];
      })
    );
    expect(result.success).toBe(false);
  });

  it('rejects any other unknown key too — the object is strict, not tags-specific', () => {
    const result = PhotoSchema.safeParse(
      mutated(PHOTOS[0], '/keywords', (draft) => {
        draft.keywords = ['fog'];
      })
    );
    expect(result.success).toBe(false);
    expect(errorText(result)).toMatch(/keywords/);
  });
});

describe('exif', () => {
  it('accepts still-life-peppers, whose six fields are all null', () => {
    const peppers = PHOTOS.find((p) => p.id === 'still-life-peppers');
    const result = PhotoSchema.safeParse(peppers);
    expect(result.success ? null : errorText(result)).toBeNull();
  });

  it('accepts every record with a null lens', () => {
    for (const photo of PHOTOS.filter((p) => (p.exif as Record<string, unknown>).lens === null)) {
      expect([photo.id, PhotoSchema.safeParse(photo).success]).toEqual([photo.id, true]);
    }
  });

  it('REJECTS a missing exif object — nullable, not optional', () => {
    const result = PhotoSchema.safeParse(
      mutated(PHOTOS[0], '/exif', (draft) => {
        delete draft.exif;
      })
    );
    expect(result.success).toBe(false);
  });

  it('REJECTS an exif object missing one of its six keys', () => {
    const result = PhotoSchema.safeParse(
      mutated(PHOTOS[0], '/exif/lens', (draft) => {
        delete (draft.exif as Record<string, unknown>).lens;
      })
    );
    expect(result.success).toBe(false);
  });

  it('rejects an unknown exif key', () => {
    const result = PhotoSchema.safeParse(
      mutated(PHOTOS[0], '/exif/gps', (draft) => {
        (draft.exif as Record<string, unknown>).gps = '12.9,77.6';
      })
    );
    expect(result.success).toBe(false);
  });
});

describe('optional photo fields', () => {
  it('accepts every record that carries no place key at all', () => {
    const MIN_PLACELESS_PHOTOS = 23;
    const without = PHOTOS.filter((p) => !('place' in p));
    expect(without.length).toBeGreaterThanOrEqual(MIN_PLACELESS_PHOTOS);
    for (const photo of without) {
      expect([photo.id, PhotoSchema.safeParse(photo).success]).toEqual([photo.id, true]);
    }
  });

  it('does NOT materialise focalPoint on parse — a write path must not rewrite every record', () => {
    const parsed = PhotoSchema.parse(PHOTOS[0]);
    expect('focalPoint' in parsed).toBe(false);
    expect(JSON.stringify(parsed)).toBe(JSON.stringify(PHOTOS[0]));
  });

  it('accepts a focalPoint in the peekPositions shape and rejects nonsense', () => {
    const ok = mutated(PHOTOS[0], '/focalPoint', (d) => {
      d.focalPoint = '50% 25%';
    });
    expect(PhotoSchema.safeParse(ok).success).toBe(true);
    const bad = mutated(PHOTOS[0], '/focalPoint', (d) => {
      d.focalPoint = 'center top';
    });
    expect(PhotoSchema.safeParse(bad).success).toBe(false);
  });
});

describe('projects', () => {
  it('rejects a description that carries a literal component figure (OD-6)', () => {
    const projects = mutated(PROJECTS, '/4/description', (draft) => {
      draft[4].description = '79-component React library with semantic tokens.';
    });
    const result = ProjectsSchema.safeParse(projects);
    expect(result.success).toBe(false);
    expect(errorText(result)).toMatch(/OD-6|component/i);
  });

  it('rejects the spaced form too — "81 component"', () => {
    const projects = mutated(PROJECTS, '/4/description', (draft) => {
      draft[4].description = '81 component React library.';
    });
    expect(ProjectsSchema.safeParse(projects).success).toBe(false);
  });

  it('accepts the placeholder token that is on disk', () => {
    expect(ProjectsSchema.safeParse(PROJECTS).success).toBe(true);
  });

  it('accepts a null icon on the two records that carry one', () => {
    const nullIcons = PROJECTS.filter((p) => p.icon === null).map((p) => p.id);
    expect(nullIcons).toEqual(['cairn', 'design-system']);
  });

  it('REJECTS a missing icon key — nullable, not optional', () => {
    const projects = mutated(PROJECTS, '/1/icon', (draft) => {
      delete draft[1].icon;
    });
    expect(ProjectsSchema.safeParse(projects).success).toBe(false);
  });
});

describe('résumé structure', () => {
  it('REJECTS a resurrected projects key — D-24 moved it to data/projects.json', () => {
    const result = ResumeSchema.safeParse(
      mutated(RESUME, '/projects', (draft) => {
        draft.projects = [];
      })
    );
    expect(result.success).toBe(false);
    expect(errorText(result)).toMatch(/projects/);
  });

  it('REJECTS a resurrected period string — OD-4 made it derived', () => {
    const result = ResumeSchema.safeParse(
      mutated(RESUME, '/experience/0/period', (draft) => {
        (draft.experience as Record<string, unknown>[])[0].period = 'Jul 2023 – Present';
      })
    );
    expect(result.success).toBe(false);
    expect(errorText(result)).toMatch(/period/);
  });

  it('REJECTS a range that is both open and closed — the formatPeriod invariant', () => {
    const result = ResumeSchema.safeParse(
      mutated(RESUME, '/experience/0/endYear', (draft) => {
        (draft.experience as Record<string, unknown>[])[0].endYear = 2026;
      })
    );
    expect(result.success).toBe(false);
  });

  it('REJECTS a closed range with no end', () => {
    const result = ResumeSchema.safeParse(
      mutated(RESUME, '/experience/1/endMonth', (draft) => {
        delete (draft.experience as Record<string, unknown>[])[1].endMonth;
      })
    );
    expect(result.success).toBe(false);
  });

  it('REJECTS month 13', () => {
    const result = ResumeSchema.safeParse(
      mutated(RESUME, '/experience/1/endMonth', (draft) => {
        (draft.experience as Record<string, unknown>[])[1].endMonth = 13;
      })
    );
    expect(result.success).toBe(false);
  });

  it('accepts null logo and null url — nullable, not optional', () => {
    const nulls = (RESUME.experience as Record<string, unknown>[]).filter((e) => e.logo === null);
    expect(nulls).toHaveLength(3);
    expect(ResumeSchema.safeParse(RESUME).success).toBe(true);
  });

  it('REJECTS a missing logo key', () => {
    const result = ResumeSchema.safeParse(
      mutated(RESUME, '/experience/0/logo', (draft) => {
        delete (draft.experience as Record<string, unknown>[])[0].logo;
      })
    );
    expect(result.success).toBe(false);
  });

  it('applies the HTML rule to education leadership too, not only to experience bullets', () => {
    const result = ResumeSchema.safeParse(
      mutated(RESUME, '/education/0/leadership/0', (draft) => {
        (draft.education as { leadership: string[] }[])[0].leadership[0] = '<b>Director</b>';
      })
    );
    expect(result.success).toBe(false);
  });
});

describe('site_config', () => {
  it('REJECTS an "all" category id at the source, so RI-1 needs no exclusion list', () => {
    const result = SiteConfigSchema.safeParse(
      mutated(SITE, '/categories/0/id', (draft) => {
        (draft.categories as Record<string, unknown>[])[0].id = 'all';
      })
    );
    expect(result.success).toBe(false);
    expect(errorText(result)).toMatch(/OD-2|all/i);
  });

  it('REJECTS an uppercase id — no case transform anywhere', () => {
    const result = SiteConfigSchema.safeParse(
      mutated(SITE, '/categories/0/id', (draft) => {
        (draft.categories as Record<string, unknown>[])[0].id = 'Abstract';
      })
    );
    expect(result.success).toBe(false);
  });

  it('REJECTS duplicate category ids', () => {
    const result = SiteConfigSchema.safeParse(
      mutated(SITE, '/categories/1/id', (draft) => {
        const cats = draft.categories as Record<string, unknown>[];
        cats[1].id = cats[0].id;
      })
    );
    expect(result.success).toBe(false);
  });

  it('REJECTS a missing defaultColumns — OD-2 put the unfiltered count here', () => {
    const result = SiteConfigSchema.safeParse(
      mutated(SITE, '/defaultColumns', (draft) => {
        delete draft.defaultColumns;
      })
    );
    expect(result.success).toBe(false);
  });
});

describe('home_config', () => {
  it('REJECTS a cta style outside the two in use', () => {
    const result = HomeConfigSchema.safeParse(
      mutated(HOME, '/ctas/0', (draft) => {
        (draft.ctas as Record<string, unknown>[]).push({
          text: 'Somewhere',
          link: '/somewhere',
          style: 'ghost',
        });
      })
    );
    expect(result.success, 'a cta style outside primary|secondary was accepted').toBe(false);
  });

  it('ACCEPTS a cta the admin could add back', () => {
    const result = HomeConfigSchema.safeParse(
      mutated(HOME, '/ctas/0', (draft) => {
        (draft.ctas as Record<string, unknown>[]).push({
          text: 'Somewhere',
          link: '/somewhere',
          style: 'primary',
        });
      })
    );
    expect(result.success, 'a well-formed cta was rejected').toBe(true);
  });

  it('REJECTS a peek position that is not in the "N% N%" shape', () => {
    const result = HomeConfigSchema.safeParse(
      mutated(HOME, '/peekPositions/architecture-hawamahaldaytime', (draft) => {
        (draft.peekPositions as Record<string, string>)['architecture-hawamahaldaytime'] = 'top';
      })
    );
    expect(result.success).toBe(false);
  });
});

describe('module hygiene — these files run inside workerd during prerender', () => {
  const FILES = [
    'photo.ts',
    'site.ts',
    'resume.ts',
    'projects.ts',
    'home.ts',
    'content-set.ts',
    'index.ts',
  ];

  it.each(FILES)('src/schemas/%s imports no Node-only module', (file) => {
    const text = source(`src/schemas/${file}`);
    expect(text).not.toMatch(/from\s+'node:/);
    expect(text).not.toMatch(/from\s+'(fs|path|url|crypto|child_process)'/);
  });

  it.each(FILES)('src/schemas/%s imports zod from astro/zod, never bare', (file) => {
    const text = source(`src/schemas/${file}`);
    expect(text).not.toMatch(/from\s+'zod'/);
    if (/\bz\./.test(text)) {
      expect(text).toMatch(/from\s+'astro\/zod'/);
    }
  });

  it('package.json declares no zod — astro bundles it and a second copy is the hazard', () => {
    const pkg = read('package.json') as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(pkg.dependencies?.zod).toBeUndefined();
    expect(pkg.devDependencies?.zod).toBeUndefined();
  });

  it('photo.ts reads the origin from src/lib/image-origin.ts rather than retyping it', () => {
    const text = source('src/schemas/photo.ts');
    expect(text).toMatch(/from\s+'[^']*lib\/image-origin'/);
    expect(text).not.toContain('images.akhilsaxena.com');
  });

  it('photo.ts does NOT enumerate the seven category names — that is the D-25 second source', () => {
    const text = source('src/schemas/photo.ts');
    expect(text).not.toMatch(/z\.enum\(/);
    expect(text).not.toContain("'wildlife'");
  });
});
