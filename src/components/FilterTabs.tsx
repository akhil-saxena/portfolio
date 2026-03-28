const CATEGORIES = ["All", "Abstract", "Architecture", "Nature", "Portraits", "Street", "Wildlife", "Product"];

interface FilterTabsProps {
  active: string;
  onSelect: (category: string) => void;
  searchActive?: boolean;
  counts?: Record<string, number>;
}

export default function FilterTabs({ active, onSelect, searchActive, counts }: FilterTabsProps) {
  return (
    <div className="filter-tabs" role="tablist" aria-label="Photo categories">
      {CATEGORIES.map((cat) => {
        const count = counts?.[cat] ?? 0;
        return (
          <button
            key={cat}
            role="tab"
            aria-selected={!searchActive && active === cat}
            className={`filter-tab ${!searchActive && active === cat ? "active" : ""}`}
            onClick={() => onSelect(cat)}
          >
            {cat}
            {count > 0 && <span className="filter-count">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
