const CATEGORIES = ["All", "Abstract", "Architecture", "Nature", "Portraits", "Street", "Wildlife", "Product"];

interface FilterTabsProps {
  active: string;
  onSelect: (category: string) => void;
  searchActive?: boolean;
}

export default function FilterTabs({ active, onSelect, searchActive }: FilterTabsProps) {
  return (
    <div className="filter-tabs" role="tablist" aria-label="Photo categories">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          role="tab"
          aria-selected={!searchActive && active === cat}
          className={`filter-tab ${!searchActive && active === cat ? "active" : ""}`}
          onClick={() => onSelect(cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
