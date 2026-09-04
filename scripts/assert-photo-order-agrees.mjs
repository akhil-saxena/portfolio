/**
 * `gate:photo-order` — the one assumption client-side filtering rests on.
 *
 * Until 2026-09-02 the eight gallery routes each rendered their OWN subset: `/photography` sorted
 * the corpus by `order`, and each `/photography/<category>` sorted its members by `categoryOrder`.
 * Filtering is now an attribute rather than a request, so all eight documents render ONE list and
 * hide what does not match — and one list cannot hold two orders.
 *
 * `order` is the one they all use. That is only invisible while, for every category, sorting its
 * members by `order` and by `categoryOrder` produces the SAME sequence. MEASURED at the time of the
 * change: all seven agreed. Nothing in the manifest enforces it, and the admin writes both fields,
 * so the day somebody reorders one category the site would quietly show that category's
 * photographs in a different order than curated — with a green build and no visible error.
 *
 * This is that error.
 */
import { readFileSync } from 'node:fs';

const MANIFEST = 'data/portfolio_images.json';

const raw = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const photos = Array.isArray(raw) ? raw : (raw.photos ?? raw.images);

if (!Array.isArray(photos) || photos.length === 0) {
  console.error(
    `assert-photo-order-agrees: ${MANIFEST} did not yield a non-empty array of photographs, so ` +
      'this gate would pass by having nothing to check — the exact shape of vacuous green it ' +
      'exists to prevent.'
  );
  process.exit(1);
}

const byCategory = new Map();
for (const photo of photos) {
  const list = byCategory.get(photo.category) ?? [];
  list.push(photo);
  byCategory.set(photo.category, list);
}

const failures = [];
for (const [category, members] of byCategory) {
  const byOrder = [...members].sort((a, b) => a.order - b.order).map((p) => p.id);
  const byCategoryOrder = [...members]
    .sort((a, b) => a.categoryOrder - b.categoryOrder)
    .map((p) => p.id);
  if (JSON.stringify(byOrder) !== JSON.stringify(byCategoryOrder)) {
    failures.push({ category, byOrder, byCategoryOrder });
  }
}

if (failures.length > 0) {
  console.error('assert-photo-order-agrees: FAIL\n');
  for (const failure of failures) {
    console.error(
      `  ${failure.category} — \`order\` and \`categoryOrder\` disagree.\n` +
        `    by order:         ${failure.byOrder.join(', ')}\n` +
        `    by categoryOrder: ${failure.byCategoryOrder.join(', ')}\n`
    );
  }
  console.error(
    'The gallery renders ONE list on all eight routes and hides what does not match, so it can\n' +
      'only honour one of these two orders — it honours `order`. While they agree that is\n' +
      'invisible; now they do not, and this category would render in an order nobody curated.\n\n' +
      'Fix by making `categoryOrder` agree with `order` within the category (they are the same\n' +
      'sequence, so one of the two fields is redundant and could be retired), or by deciding that\n' +
      'category views get their own order again — which means giving up client-side filtering for\n' +
      'them, and saying so here.'
  );
  process.exit(1);
}

console.log(
  `assert-photo-order-agrees: PASS — ${byCategory.size} categories, ${photos.length} photographs, ` +
    '`order` and `categoryOrder` agree within every one.'
);
