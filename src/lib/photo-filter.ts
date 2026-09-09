export const GRID_ID = 'ph-grid';

export const TITLE_ID = 'ph-title';

export const COUNT_ID = 'ph-count';

export const ALL = 'all';

export const GRID_CATEGORY_ATTRIBUTE = 'data-category';

export const TILE_CATEGORY_ATTRIBUTE = 'data-cat';

export const FILTER_EVENT = 'ph:filter';

export interface FilterCategory {
  readonly id: string;
  readonly label: string;
  readonly columns: number;
}

export function categoryFromPathname(
  pathname: string,
  categories: readonly FilterCategory[]
): string {
  const trimmed = pathname.replace(/\/+$/, '');
  const segment = trimmed.slice(trimmed.lastIndexOf('/') + 1);
  if (segment === '' || segment === 'photography') return ALL;
  return categories.some((category) => category.id === segment) ? segment : ALL;
}

export function countLineFor(category: string, visible: number, total: number): string {
  void category;
  void total;
  return `${visible} ${visible === 1 ? 'photograph' : 'photographs'}`;
}

export function columnsFor(
  category: string,
  categories: readonly FilterCategory[],
  defaultColumns: number
): number {
  if (category === ALL) return defaultColumns;
  return categories.find((c) => c.id === category)?.columns ?? defaultColumns;
}

export function isVisibleIn(photoCategory: string, activeCategory: string): boolean {
  return activeCategory === ALL || photoCategory === activeCategory;
}
