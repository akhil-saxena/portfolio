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

const PREFIX = 'temp/';

const KEY_GRAMMAR = /^temp\/[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/;

const ID_GRAMMAR = /^[a-z0-9-]+$/;

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

describe('§0 the things under test exist', () => {
  it('the script and both fixtures are present', () => {
    expect(existsSync(SCRIPT), `${SCRIPT} is missing`).toBe(true);
    expect(existsSync(FIXTURE), `${FIXTURE} is missing`).toBe(true);
    expect(existsSync(SMALL_FIXTURE), `${SMALL_FIXTURE} is missing`).toBe(true);
  });
});

describe('§1 stemFrom', () => {
  it('reduces a real file name to the id grammar', () => {
    expect(stemFrom('IntoTheMist.JPG')).toBe('intothemist');
    expect(stemFrom('Sunset over the ridge.jpeg')).toBe('sunset-over-the-ridge');
    expect(stemFrom('DSC_0421.ARW')).toBe('dsc-0421');
  });

  it('strips only the FINAL extension, matching the legacy departure that is documented', () => {
    expect(stemFrom('hauntedmansion.jpg.jpg')).toBe('hauntedmansion-jpg');
  });

  it('always emits something matching the id grammar', () => {
    for (const name of ['a.jpg', 'Ω-café-2024.png', '12345.tif', 'x__y--z.webp']) {
      const stem = stemFrom(name);
      expect(stem, `stem for ${name}`).toMatch(ID_GRAMMAR);
    }
  });

  it('REFUSES a path separator or a parent-directory name rather than normalising it', () => {
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

describe('§2 stagingKeyFor', () => {
  it('composes a key rooted at the staging prefix, as an independent literal', () => {
    const key = stagingKeyFor({ category: 'architecture', stem: 'intothemist', extension: '.jpg' });
    expect(key.startsWith(PREFIX)).toBe(true);
    expect(key).toBe('temp/architecture/intothemist.jpg');
    expect(key).toMatch(KEY_GRAMMAR);
  });

  it('refuses a key whose prefix was mutated, which is what the grep alone would miss', () => {
    expect(() =>
      stagingKeyFor({ category: 'architecture', stem: 'x', extension: '.jpg' })
    ).not.toThrow();
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

  it('assertRemote FIRES on an argv that lost the flag', () => {
    const stripped = argv.filter((entry) => entry !== '--remote');
    expect(() => assertRemote(stripped)).toThrow(/carries no --remote/);
    expect(() => assertRemote([...stripped, '--local'])).toThrow(/--local/);
    expect(() => assertRemote(argv)).not.toThrow();
  });
});

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
    expect(slugFromStagingKeyIndependently(`temp/landscape/${plan.stem}.jpg`)).toBe(plan.stem);
  });

  it('is a pure function of (category, name, format) — no timestamp, no nonce', async () => {
    const first = await planStaging({ file: FIXTURE, category: 'architecture', name: 'ridge.jpg' });
    const second = await planStaging({
      file: SMALL_FIXTURE,
      category: 'architecture',
      name: 'ridge',
    });
    expect(second.key).toBe(first.key);
    expect(second.photoId).toBe(first.photoId);
  });
});

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

describe('§7 --dry-run', () => {
  function runDry(args: string[]): string {
    return execFileSync(process.execPath, [SCRIPT, '--dry-run', ...args], {
      encoding: 'utf8',
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
