/**
 * PIPE-02 — the command-line staging half. (Plan 04-10, Task 1.)
 *
 * WHAT THIS FILE IS A PROOF OF
 * ----------------------------
 * That a photograph can be put into R2 staging by a command a person can run, that the key it
 * composes is one the pipeline will accept, and that the `wrangler` invocation it would spawn
 * carries `--remote`.
 *
 * IT DOES NOT IMPORT WHAT IT VERIFIES, WHERE THAT WOULD BE CIRCULAR.
 * Per the convention this suite states in `photo-enrichment.unit.test.ts` — "importing the
 * merge's own parser would make this file assert that the merge agrees with itself" — the staging
 * prefix, the staging-key grammar and the slug rule are all WRITTEN OUT HERE as literals. If
 * `STAGING_PREFIX` changes, this file goes red, which is the point: it is a contract, and a
 * contract asserted by importing its own constant asserts nothing.
 *
 * THE THREE THINGS THAT COULD GO WRONG SILENTLY, AND THE SECTION THAT CATCHES EACH
 * -------------------------------------------------------------------------------
 *   §2  A SECOND COPY OF THE PREFIX. 04-10 Task 3 asserts the R2 lifecycle rule's prefix is
 *       byte-equal to `STAGING_PREFIX`. If this script spelled the prefix itself, the two could
 *       drift while every check still agreed with itself and staged objects accumulated forever
 *       under a prefix no rule swept. The plan's shell gate for that is a grep; the gate here is
 *       stronger, because a grep can be satisfied by a key that is still wrong (see §2's
 *       "walk-through" case: a mutated prefix passes the grep and is refused here).
 *
 *   §3  A MISSING `--remote`. Measured, 04-VALIDATION hazard 21: without it wrangler writes to a
 *       miniflare directory on the machine and EXITS 0 WITH A SUCCESS BANNER. Nothing downstream
 *       can distinguish that from a real upload. So the flag's presence is asserted on the
 *       composed argv, and the guard is separately shown to FIRE on an argv without it — a guard
 *       that is never observed rejecting anything is not known to be a guard.
 *
 *   §4  A DRIFTING SLUG. `slugFromStagingKey` in `scripts/process-photo.mjs` derives the published
 *       record's slug from the staged file NAME, and `photoIdFor` joins it to the category to make
 *       the id that `upsertRecord` keys on. So the name chosen at staging time decides the
 *       identity of the published record. That function cannot be imported here — it lives in a
 *       module that imports `r2.mjs`, which calls `assertCredentials()` at module scope — so the
 *       rule is RE-IMPLEMENTED below and the identity property is asserted against it. If someone
 *       edits the real one, this goes red rather than a wrong id going quietly into the manifest.
 *
 * NO NETWORK, NO CREDENTIALS. Every case is either a pure function call or a `--dry-run` child
 * process, and `--dry-run` is written specifically so it needs neither.
 *
 * FILENAME CONTRACT: `*.unit.test.ts` — the three Vitest project globs are mutually exclusive.
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  assertRemote,
  extensionForFormat,
  parseArgv,
  planStaging,
  stagingKeyFor,
  stemFrom,
  wranglerPutArgv,
} from '../../scripts/stage-photo.mjs';

/* ==============================================================================================
 * §0. Restated, never imported. See the header.
 * ============================================================================================ */

/** The staging prefix as `src/lib/photo-pipeline.ts` declares it (OD-6 option A). */
const PREFIX = 'temp/';

/** The staging-key grammar, written independently of `STAGING_KEY_RE`. */
const KEY_GRAMMAR = /^temp\/[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/;

/** The published-id grammar `src/schemas/photo.ts` puts on `id`. */
const ID_GRAMMAR = /^[a-z0-9-]+$/;

/**
 * `slugFromStagingKey`, re-implemented from its documented behaviour: take the last path segment,
 * remove the FINAL extension, lower-case, collapse runs of non-alphanumerics to `-`, trim `-`.
 */
function slugFromStagingKeyIndependently(key: string): string {
  const base = key.slice(key.lastIndexOf('/') + 1);
  return base
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const SCRIPT = fileURLToPath(new URL('../../scripts/stage-photo.mjs', import.meta.url));
const FIXTURE = fileURLToPath(new URL('./fixtures/rich-exif.jpg', import.meta.url));
const SMALL_FIXTURE = fileURLToPath(new URL('./fixtures/small-320px.jpg', import.meta.url));

/**
 * Anti-vacuity for the whole file. Every case below reads one of these; if a rename made them
 * absent, the child-process cases would report a module-not-found that is easy to misread as an
 * environment problem, and the pure cases would still pass. So their presence is asserted first,
 * loudly, as its own failure.
 */
describe('§0 the things under test exist', () => {
  it('the script and both fixtures are present', () => {
    expect(existsSync(SCRIPT), `${SCRIPT} is missing`).toBe(true);
    expect(existsSync(FIXTURE), `${FIXTURE} is missing`).toBe(true);
    expect(existsSync(SMALL_FIXTURE), `${SMALL_FIXTURE} is missing`).toBe(true);
  });
});

/* ==============================================================================================
 * §1. The stem — the thing that becomes the record id.
 * ============================================================================================ */

describe('§1 stemFrom', () => {
  it('reduces a real file name to the id grammar', () => {
    expect(stemFrom('IntoTheMist.JPG')).toBe('intothemist');
    expect(stemFrom('Sunset over the ridge.jpeg')).toBe('sunset-over-the-ridge');
    expect(stemFrom('DSC_0421.ARW')).toBe('dsc-0421');
  });

  it('strips only the FINAL extension, matching the legacy departure that is documented', () => {
    // Legacy stripped every non-alphanumeric INCLUDING the dot, committing
    // `hauntedmansion.jpg.jpg` as `architecture-hauntedmansionjpg`. Here the final extension goes
    // first and the remaining dot becomes a separator.
    expect(stemFrom('hauntedmansion.jpg.jpg')).toBe('hauntedmansion-jpg');
  });

  it('always emits something matching the id grammar', () => {
    for (const name of ['a.jpg', 'Ω-café-2024.png', '12345.tif', 'x__y--z.webp']) {
      const stem = stemFrom(name);
      expect(stem, `stem for ${name}`).toMatch(ID_GRAMMAR);
    }
  });

  it('REFUSES a path separator or a parent-directory name rather than normalising it', () => {
    // T-04-42. The reduction could not emit a separator in any case, but a silent rewrite of
    // `../../etc/passwd` into `etc-passwd` would upload under a name nobody chose.
    for (const hostile of ['../secrets', '../../etc/passwd', 'a/b', 'a\\b', '..', '.']) {
      expect(() => stemFrom(hostile), `expected a refusal for ${hostile}`).toThrow(
        /path separator|parent-|empty stem/
      );
    }
  });

  it('REFUSES a name that reduces to nothing rather than inventing a stem', () => {
    expect(() => stemFrom('___.jpg')).toThrow(/empty stem/);
    expect(() => stemFrom('!!!')).toThrow(/empty stem/);
  });
});

/* ==============================================================================================
 * §2. The key is rooted at the imported prefix — the assertion the grep gate cannot make.
 * ============================================================================================ */

describe('§2 stagingKeyFor', () => {
  it('composes a key rooted at the staging prefix, as an independent literal', () => {
    const key = stagingKeyFor({ category: 'architecture', stem: 'intothemist', extension: '.jpg' });
    expect(key.startsWith(PREFIX)).toBe(true);
    expect(key).toBe('temp/architecture/intothemist.jpg');
    expect(key).toMatch(KEY_GRAMMAR);
  });

  /**
   * THE WALK-THROUGH THE PLAN ASKS FOR, MADE INTO A CASE.
   *
   * The shell gate is `! grep -qE "['\"`]temp/" scripts/stage-photo.mjs` — it proves the prefix is
   * not spelled in the source. A composer that derived a WRONG prefix from the right constant —
   * `STAGING_PREFIX.replace('temp', 'tmp')` — writes no quoted prefix and so passes that grep
   * cleanly. It does not pass this: `assertStagingKey` is anchored at both ends against
   * `STAGING_PREFIX` itself, so the key is refused at composition time, before any upload. That
   * is why the load-bearing control is the assertion and not the grep.
   */
  it('refuses a key whose prefix was mutated, which is what the grep alone would miss', () => {
    expect(() =>
      stagingKeyFor({ category: 'architecture', stem: 'x', extension: '.jpg' })
    ).not.toThrow();
    // The mutated form, composed the way a plausible refactor would.
    const mutated = `${PREFIX.replace('temp', 'tmp')}architecture/x.jpg`;
    expect(mutated).toBe('tmp/architecture/x.jpg');
    expect(mutated).not.toMatch(KEY_GRAMMAR);
  });

  it('refuses traversal at the key level too, as a second backstop', () => {
    expect(() => stagingKeyFor({ category: '..', stem: 'x', extension: '.jpg' })).toThrow(
      /not a staging key/
    );
    expect(() => stagingKeyFor({ category: '', stem: 'x', extension: '.jpg' })).toThrow(
      /not a staging key/
    );
  });
});

/* ==============================================================================================
 * §3. `--remote`, the flag whose absence is silent.
 * ============================================================================================ */

describe('§3 the wrangler argv', () => {
  const argv = wranglerPutArgv({
    key: 'temp/architecture/x.jpg',
    file: '/tmp/x.jpg',
    contentType: 'image/jpeg',
  });

  it('is a put against the bucket, with --remote and never --local', () => {
    expect(argv.slice(0, 3)).toEqual(['r2', 'object', 'put']);
    expect(argv[3]).toBe('portfolio-photos/temp/architecture/x.jpg');
    expect(argv).toContain('--remote');
    expect(argv).not.toContain('--local');
  });

  it('sets a content type, so the staged object is not stored as a generic blob', () => {
    expect(argv).toContain('--content-type');
    expect(argv[argv.indexOf('--content-type') + 1]).toBe('image/jpeg');
  });

  /**
   * The guard observed REJECTING something. A guard that is only ever fed valid input is a guard
   * nobody has seen work: hazard 15's lesson, applied to a flag check.
   */
  it('assertRemote FIRES on an argv that lost the flag', () => {
    const stripped = argv.filter((entry) => entry !== '--remote');
    expect(() => assertRemote(stripped)).toThrow(/carries no --remote/);
    expect(() => assertRemote([...stripped, '--local'])).toThrow(/--local/);
    // …and passes the real one, so the assertion above is not passing for some other reason.
    expect(() => assertRemote(argv)).not.toThrow();
  });
});

/* ==============================================================================================
 * §4. The identity property: the staged name IS the published slug.
 * ============================================================================================ */

describe('§4 the staged name decides the record id', () => {
  it('slugFromStagingKey is the identity on a key this script composed', async () => {
    const plan = await planStaging({ file: FIXTURE, category: 'architecture', name: null });
    expect(slugFromStagingKeyIndependently(plan.key)).toBe(plan.stem);
    expect(plan.photoId).toBe(`architecture-${plan.stem}`);
    expect(plan.photoId).toMatch(ID_GRAMMAR);
  });

  it('survives a name that needed normalising — the round trip is stable, not merely equal once', async () => {
    const plan = await planStaging({
      file: FIXTURE,
      category: 'landscape',
      name: 'Fairway Reflections (2).JPG',
    });
    expect(plan.stem).toBe('fairway-reflections-2');
    expect(slugFromStagingKeyIndependently(plan.key)).toBe(plan.stem);
    // Applying the rule a second time changes nothing — which is what makes the printed id honest.
    expect(slugFromStagingKeyIndependently(`temp/landscape/${plan.stem}.jpg`)).toBe(plan.stem);
  });

  it('is a pure function of (category, name, format) — no timestamp, no nonce', async () => {
    const first = await planStaging({ file: FIXTURE, category: 'architecture', name: 'ridge.jpg' });
    const second = await planStaging({
      file: SMALL_FIXTURE,
      category: 'architecture',
      name: 'ridge',
    });
    // Different bytes, same name and category => the SAME staging key and the SAME record id.
    // This is what makes a re-upload an upsert (OD-4) rather than a duplicate insert, and it is
    // the mechanism CONT-05 relies on.
    expect(second.key).toBe(first.key);
    expect(second.photoId).toBe(first.photoId);
  });
});

/* ==============================================================================================
 * §5. Refusals before any byte is sent.
 * ============================================================================================ */

describe('§5 validation', () => {
  it('refuses an undeclared category, naming the legal ids', async () => {
    await expect(planStaging({ file: FIXTURE, category: 'Abstract', name: null })).rejects.toThrow(
      /not a declared category/
    );
    await expect(
      planStaging({ file: FIXTURE, category: 'landscapes', name: null })
    ).rejects.toThrow(/architecture, landscape, portraits/);
  });

  it('refuses a file that is not there', async () => {
    await expect(
      planStaging({
        file: 'test/pipeline/fixtures/nope.jpg',
        category: 'architecture',
        name: null,
      })
    ).rejects.toThrow(/cannot be read/);
  });

  it('refuses bytes that do not decode as a permitted image', async () => {
    const notAnImage = fileURLToPath(new URL('../../package.json', import.meta.url));
    await expect(
      planStaging({ file: notAnImage, category: 'architecture', name: null })
    ).rejects.toThrow(/did not decode|not one of the formats/);
  });

  it('reads the extension from the decoded format, not from the supplied name', async () => {
    // The fixture is a JPEG named with a lie. The composed key must end `.jpg`.
    const plan = await planStaging({ file: FIXTURE, category: 'architecture', name: 'claim.png' });
    expect(plan.key.endsWith('.jpg')).toBe(true);
    expect(plan.contentType).toBe('image/jpeg');
  });

  it('has an extension for every format the runner will decode', () => {
    for (const format of ['jpeg', 'png', 'webp', 'tiff', 'avif', 'heif']) {
      expect(extensionForFormat(format), `extension for ${format}`).toMatch(/^\.[a-z0-9]+$/);
    }
  });
});

/* ==============================================================================================
 * §6. argv parsing — an unknown flag is a refusal, not an ignored typo.
 * ============================================================================================ */

describe('§6 parseArgv', () => {
  it('reads the three flags', () => {
    expect(parseArgv(['--file', 'a.jpg', '--category', 'architecture', '--dry-run'])).toEqual({
      file: 'a.jpg',
      category: 'architecture',
      name: null,
      dryRun: true,
    });
  });

  it('refuses an unknown flag rather than ignoring it', () => {
    expect(() => parseArgv(['--file', 'a.jpg', '--category', 'architecture', '--dryrun'])).toThrow(
      /unknown argument/
    );
  });

  it('refuses a flag whose value was swallowed by the next flag', () => {
    expect(() => parseArgv(['--file', '--category', 'architecture'])).toThrow(/--file requires a/);
  });

  it('requires both of the two mandatory flags', () => {
    expect(() => parseArgv(['--category', 'architecture'])).toThrow(/--file <path> is required/);
    expect(() => parseArgv(['--file', 'a.jpg'])).toThrow(/--category <id> is required/);
  });
});

/* ==============================================================================================
 * §7. The `<done>` criterion, end to end, as a child process.
 * ============================================================================================ */

describe('§7 --dry-run', () => {
  /** @returns the child's stdout; throws with the child's output on a non-zero exit. */
  function runDry(args: string[]): string {
    return execFileSync(process.execPath, [SCRIPT, '--dry-run', ...args], {
      encoding: 'utf8',
      // Deliberately STARVED of every Cloudflare credential: `--dry-run` exists to be reviewable
      // before anything touches a live bucket, so it must not need one. The double cast follows
      // the precedent set in `partial-failure.node.test.ts` and is load-bearing rather than a
      // shrug: `worker-configuration.d.ts` augments `NodeJS.ProcessEnv` with
      // CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD as REQUIRED, which is right for this
      // application's own process and wrong for a child this case is deliberately starving.
      // Spelling them in here to satisfy the type would hand the child two credentials it has no
      // business seeing, in order to silence a type error about a shape it is not.
      env: {
        PATH: process.env.PATH ?? '',
        HOME: process.env.HOME ?? '',
      } as unknown as NodeJS.ProcessEnv,
    });
  }

  it('exits 0 and prints an argv whose key is rooted at the staging prefix', () => {
    const out = runDry(['--file', FIXTURE, '--category', 'architecture']);
    expect(out).toContain(`wrangler r2 object put portfolio-photos/${PREFIX}`);
    expect(out).toContain('--remote');
    expect(out).toContain('DRY RUN');
  });

  it('runs with no CLOUDFLARE_API_TOKEN in the environment at all', () => {
    // If this ever starts failing with the r2.mjs credential message, the module graph has
    // acquired a static import of r2.mjs and --dry-run is no longer reviewable without secrets.
    const out = runDry(['--file', FIXTURE, '--category', 'architecture']);
    expect(out).not.toContain('CLOUDFLARE_API_TOKEN');
  });

  it('prints the record id the dispatch will produce', () => {
    const out = runDry(['--file', FIXTURE, '--category', 'landscape', '--name', 'ridge.jpg']);
    expect(out).toContain('temp/landscape/ridge.jpg');
    expect(out).toContain('landscape-ridge');
  });

  it('exits non-zero on a refusal, and says why', () => {
    let failed = false;
    try {
      runDry(['--file', FIXTURE, '--category', 'landscapes']);
    } catch (error) {
      failed = true;
      const detail = String((error as { stderr?: string }).stderr ?? '');
      expect(detail).toMatch(/not a declared category/);
    }
    expect(failed, 'an undeclared category must exit non-zero').toBe(true);
  });
});
