import type { FilterNavItem } from '@akhil-saxena/design-system/components/FilterNav';
import { FilterNav } from '@akhil-saxena/design-system/components/FilterNav';

import { type FilterCategory, GRID_ID } from '../../lib/photo-filter';
import { usePhotoFilter } from '../../lib/use-photo-filter';

export const GALLERY_HREF = '/photography';

export function categoryHref(id: string): string {
  return `${GALLERY_HREF}/${id}`;
}

export function normaliseActiveHref(pathname: string): string {
  const stripped = pathname.replace(/\/+$/, '');
  return stripped.length === 0 ? '/' : stripped;
}

export interface PhotoFiltersProps {
  readonly total: number;
  readonly defaultColumns: number;
  categories: ReadonlyArray<{ readonly id: string; readonly label: string }>;
  photos: ReadonlyArray<{ readonly id: string; readonly category: string }>;
  pathname: string;
}

export function PhotoFilters({
  categories,
  photos,
  pathname,
  total,
  defaultColumns,
}: PhotoFiltersProps) {
  usePhotoFilter({
    categories: categories as readonly FilterCategory[],
    total,
    defaultColumns,
    gridSelector: `#${GRID_ID}`,
  });

  const counts = new Map<string, number>();
  for (const photo of photos) {
    counts.set(photo.category, (counts.get(photo.category) ?? 0) + 1);
  }

  if (counts.size === 0) {
    throw new Error(
      'PhotoFilters: the group-by produced no counts, so every pill in the rail would read "· 0" ' +
        'and the site would silently have no filtering. §13.3 requires each `· n` to be derived ' +
        'from the collection; deriving it from nothing is not a derivation.'
    );
  }

  const items: FilterNavItem[] = [
    { href: GALLERY_HREF, label: 'All' },
    ...categories.map((category) => ({
      href: categoryHref(category.id),
      label: category.label,
    })),
  ];

  return (
    <FilterNav
      items={items}
      activeHref={normaliseActiveHref(pathname)}
      ariaLabel="Photo categories"
      size="sm"
      className="ph-filters"
    />
  );
}
